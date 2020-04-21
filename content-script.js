"use strict";

/**
 * A hacked together script/POC for a "Tubi Hangouts"
 * application.
 */

// constants
const host = "https://cloud.jasonlongshore.com"; // @TODO host somewhere
const toleranceMs = 3000;

// global state (ick)
let videoPositionEventHandlersInstalled = undefined;
let lastReportedPosition = undefined;
let lastTimeUpdate = 0;

function extractHangoutId(location) {
  let value = undefined;

  const pos = location.indexOf("?");

  if (pos >= 0) {
    const pairs = location.substring(pos + 1).split("&");

    console.log(`pairs=${pairs}`);

    for (const pair of pairs) {
      if (pair.startsWith("hangoutId=")) {
        value = pair.substring(10); // 10 == "hangoutId=".length
      }
    }
  }

  return value;
}

function extractVideoId(location) {
  const prefix = "https://tubitv.com/movies/";
  const l = location.startsWith(prefix) ? location.substring(prefix.length) : location;
  const parts = l.split('/');

  return parts.length > 0 ? parseInt(parts[0], 10) : undefined;
}

function videoCurrentTimeMs(video) {
  return Math.floor(video.currentTime * 1000);
}

function reportPosition(hangoutId) {
  const videoId = extractVideoId(window.location.href);

  console.log(`reportPosition(${hangoutId}): videoId=${videoId}`);

  const videos = document.getElementsByTagName('video');

  if (videoId !== undefined && videos.length > 0) {
    const video = videos[0];
    const url = `${host}/api/hangouts/${hangoutId}/commands/update-video-position`;
    const currentTimeMs = videoCurrentTimeMs(video);
    const data = JSON.stringify({
      id: videoId,
      position: currentTimeMs,
      paused: video.paused
    });

    if (videoPositionEventHandlersInstalled !== videoId) {
      videoPositionEventHandlersInstalled = videoId;

      video.addEventListener("play", () => reportPosition(hangoutId));
      video.addEventListener("pause", () => reportPosition(hangoutId));
      video.addEventListener("timeupdate", () => {
        if (Math.abs(videoCurrentTimeMs(video) - lastTimeUpdate) >= 1000) {
          reportPosition(hangoutId);
        }
      });
    }

    if (lastReportedPosition === undefined || lastReportedPosition !== data) {
      jQuery.ajax(url, {
        data: data,
        contentType: 'application/json',
        type: 'POST'
      });
      lastReportedPosition = data;
      lastTimeUpdate = currentTimeMs;
    };
  } else {
    // try again in some time..

    setTimeout(() => reportPosition(hangoutId), 1000);
  }
}

function handleBroadcastEvent(hangoutId, event) {
  try {
    const parsed = JSON.parse(event.data);
    const type = typeof parsed === 'object' && typeof parsed.type === 'string' ? parsed.type : "";

    switch (type) {
      case "VideoPositionUpdated":
        if (typeof parsed.id === 'number' && typeof parsed.position === 'number' && typeof parsed.paused === 'boolean') {
          if (extractVideoId(window.location.href) !== parsed.id) {
            // video has changed, update URI @TODO probably we can do much better
            console.log(`video has changed, now ${parsed.id}`);

            window.location.href = `https://tubitv.com/movies/${parsed.id}?hangoutId=${hangoutId}`;
          }

          const videos = document.getElementsByTagName('video');

          if (videos.length > 0) {
            const video = videos[0];

            // reconcile status from server with local player status

            if (Math.abs(videoCurrentTimeMs(video) - parsed.position) > toleranceMs) {
              video.currentTime = parsed.position / 1000;
            }

            if (parsed.paused && !video.paused) {
              video.pause();
            }

            if (!parsed.paused && video.paused) {
              video.play();
            }
          }
        }

        break;

      default:
        break;
    }


  } catch (e) {}
}

function initialize() {
  const videoId = extractVideoId(window.location.href);
  const hangoutId = extractHangoutId(window.location.href);

  console.log(`videoId=${videoId} hangoutId=${hangoutId}`);

  let checkLoadedInterval = undefined;

  const checkLoaded = () => {
    const content = document.getElementById('content');

    if (content !== null) {
      const hangoutContainer = document.createElement('div');
      hangoutContainer.id = "tubi-hangout-chat-container";
      hangoutContainer.style.position = "fixed";
      hangoutContainer.style.left = 0;
      hangoutContainer.style.right = 0;
      hangoutContainer.style.top = 50;
      hangoutContainer.style.lineHeight = 1.5;
      hangoutContainer.style.bottom = 0;
      hangoutContainer.style.backgroundColor = "#6A6A6A";
      hangoutContainer.style.color = "#FFFFFF";
      hangoutContainer.style.padding = "10px";
      hangoutContainer.style.zIndex = 10000;

      const brandLabel = document.createElement("span");
      brandLabel.innerHTML = "Tubi Party";
      brandLabel.style.fontWeight = "bold";
      brandLabel.style.display = "inline-block";
      brandLabel.style.paddingRight = "10px";
      hangoutContainer.appendChild(brandLabel);

      const hangoutLabel = document.createElement("span");
      hangoutContainer.appendChild(hangoutLabel);

      let broadcastEvents = undefined;

      if (hangoutId !== undefined) {
        hangoutLabel.innerHTML = "You are currently attending a hangout.";

        broadcastEvents = new EventSource(`${host}/api/hangouts/${hangoutId}/events`);
        broadcastEvents.onmessage = (event) => handleBroadcastEvent(hangoutId, event);
        broadcastEvents.on
      }

      const hangoutButton = document.createElement("button");
      hangoutButton.type = "button";
      hangoutButton.innerHTML = "Create Hangout";
      hangoutButton.style.float = "right";
      hangoutContainer.appendChild(hangoutButton);

      hangoutButton.addEventListener("click", (e) => {
        e.preventDefault();

        jQuery.ajax(`${host}/api/hangouts`, {
          data: JSON.stringify({ name: "TODO" }),
          contentType: 'application/json',
          type: 'POST'
        }).done(data => {
          if (typeof data === 'object' && data !== undefined && typeof data.id === 'string') {
            const url = `${host}/hangouts/${data.id}/join`;

            hangoutLabel.innerHTML = `You are currently hosting a hangout: <a href="${url}" target="_blank" style="color: #FFF; text-decoration: underline;">${url}</a>`;
            hangoutContainer.style.backgroundColor = "#00590A";
            hangoutButton.disabled = true;

            if (broadcastEvents !== undefined) {
              broadcastEvents.close();
              broadcastEvents = undefined;
            }

            reportPosition(data.id);
            //window.setInterval(() => reportPosition(data.id, videoId), 5000);
          }
        });
      });

      document.body.appendChild(hangoutContainer);

      if (checkLoadedInterval !== undefined) {
        window.clearInterval(checkLoadedInterval);
        checkLoadedInterval = undefined;
      }
    }
  };

  checkLoadedInterval = window.setInterval(checkLoaded, 250);
}

document.addEventListener('DOMContentLoaded', initialize);

