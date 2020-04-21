# Tubi Hangout Chrome Extension

This is an extension for Google Chrome/Chromium to allow Tubi users to
create a hangout and synchronize their playback. It's currently a POC that
demonstrates the viability of the feature, but may contain various bugs or
limitations.

## Installation

You'll need to manually install the extension.

1) Clone the repository
2) Open Chrome, navigate to `chrome://extensions`
3) Ensure Developer mode is enabled (top-right of page)
4) Select "Load unpacked," and select the cloned repository
5) Navigate to https://tubitv.com and find a _movie_ to watch
6) There should be a "Tubi Hangout" banner at the bottom of the screen. On the
   right side of this banner, select "Create Hangout."
7) Start playing the movie
8) Copy the URL from the bottom left of the screen to another computer, and
   visit it. Note that playback is reasonably synced (hopefully). Also note
   that pauses on the first computer pause in sync for the entire hangout.

## Other Ideas

* Real infrastructure for backend
* Consider ad serving experience
* Persistence (both frontend (extension) and backend)
* Tests
* Member lists
* Chat

## References

* https://developer.chrome.com/extensions/getstarted
