"use strict";

const host = "http://127.0.0.1:8080"; // @TODO host somewhere
const hangoutId = "ac67a7e3-8f1f-4dd5-bdf5-8ede3bb78cba"; // @TODO dynamic
const videoId = 314542; // @TODO dynamic
const toleranceMs = 3000;

let lastReportedPosition = undefined;
let videoPositionEventHandlersInstalled = false;
let lastTimeUpdate = 0;

function videoCurrentTimeMs(video) {
  return Math.floor(video.currentTime * 1000);
}

function reportPosition() {
  console.log('reporting position');

  const videos = document.getElementsByTagName('video');

  if (videos.length > 0) {
    const video = videos[0];
    const url = `${host}/api/hangouts/${hangoutId}/commands/update-video-position`;
    const currentTimeMs = videoCurrentTimeMs(video);
    const data = JSON.stringify({
      id: videoId,
      position: currentTimeMs,
      paused: video.paused
    });

    if (!videoPositionEventHandlersInstalled) {
      videoPositionEventHandlersInstalled = true;

      video.addEventListener("play", () => reportPosition());
      video.addEventListener("pause", () => reportPosition());
      video.addEventListener("timeupdate", () => {
        if (Math.abs(videoCurrentTimeMs(video) - lastTimeUpdate) >= 1000) {
          reportPosition();
        }
      });
    }

    if (lastReportedPosition === undefined || lastReportedPosition !== data) {
      jQuery.ajax(url, {
        data: data,
        contentType: 'application/json',
        type: 'POST',
      });
      lastReportedPosition = data;
      lastTimeUpdate = currentTimeMs;
    };
  }
}

function handleBroadcastEvent(event) {
  try {
    const parsed = JSON.parse(event.data);
    const type = typeof parsed === 'object' && typeof parsed.type === 'string' ? parsed.type : "";

    switch (type) {
      case "VideoPositionUpdated":
        if (typeof parsed.id === 'number' && typeof parsed.position === 'number' && typeof parsed.paused === 'boolean') {
          console.log(parsed);

          const videos = document.getElementsByTagName('video');

          if (videos.length > 0) {
            const video = videos[0];

            // reconcile status from server with local player status

            if (parsed.paused && !video.paused) {
              video.pause();
            }

            if (!parsed.paused && video.paused) {
              video.play();
            }

            if (Math.abs(videoCurrentTimeMs(video) - parsed.position) > toleranceMs) {
              video.currentTime = parsed.position / 1000;
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
      hangoutLabel.innerHTML = "You are currently <strong>Watching</strong>.";
      hangoutContainer.appendChild(hangoutLabel);

      const hangoutButton = document.createElement("button");
      hangoutButton.type = "button";
      hangoutButton.innerHTML = "Broadcast";
      hangoutButton.style.float = "right";
      hangoutContainer.appendChild(hangoutButton);

      const broadcastEventsUrl = `${host}/api/hangouts/${hangoutId}/events`;
      const broadcastEvents = new EventSource(broadcastEventsUrl);
      broadcastEvents.onmessage = handleBroadcastEvent;

      hangoutButton.addEventListener("click", (e) => {
        e.preventDefault();

        hangoutLabel.innerHTML = "You are currently <strong>Broadcasting</strong>.";
        hangoutContainer.style.backgroundColor = "#00590A";
        hangoutButton.disabled = true;

        broadcastEvents.close();

        reportPosition();
        //window.setInterval(reportPosition, 5000);
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

