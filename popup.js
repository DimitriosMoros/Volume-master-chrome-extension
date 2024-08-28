document.addEventListener('DOMContentLoaded', function() {
  const slider = document.getElementById('volume-slider');
  const resetButton = document.getElementById('reset-button');
  const modeButtons = document.querySelectorAll('.mode-button');
  const defaultButton = document.getElementById('default-button');
  const voiceBoostButton = document.getElementById('voice-boost-button');
  const bassBoostButton = document.getElementById('bass-boost-button');

  // Load the saved volume from localStorage
  const savedVolume = localStorage.getItem('volume') || 100;
  slider.value = savedVolume;

  // Load the saved mode from localStorage
  const savedMode = localStorage.getItem('mode') || 'default';
  document.getElementById(`${savedMode}-button`).classList.add('active');

  slider.addEventListener('input', function() {
    const volume = slider.value;
    localStorage.setItem('volume', volume); // Save the volume to localStorage

    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        function: setVolume,
        args: [volume, savedMode]
      });
    });
  });

  modeButtons.forEach(button => {
    button.addEventListener('click', function() {
      modeButtons.forEach(btn => btn.classList.remove('active'));
      this.classList.add('active');
      const mode = this.id.replace('-button', '');
      localStorage.setItem('mode', mode); // Save the mode to localStorage

      chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          function: setVolume,
          args: [slider.value, mode]
        });
      });
    });
  });

  resetButton.addEventListener('click', function() {
    const resetVolume = 100;
    slider.value = resetVolume;
    localStorage.setItem('volume', resetVolume); // Save the reset volume to localStorage
    modeButtons.forEach(btn => btn.classList.remove('active'));
    defaultButton.classList.add('active');
    localStorage.setItem('mode', 'default'); // Save the reset mode to localStorage

    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        function: setVolume,
        args: [resetVolume, 'default']
      });
    });
  });
});

function setVolume(volume, mode) {
  const videos = document.querySelectorAll('video');
  videos.forEach(video => {
    if (!video.audioContext) {
      const audioContext = new AudioContext();
      const source = audioContext.createMediaElementSource(video);
      const gainNode = audioContext.createGain();
      video.voiceFilter = audioContext.createBiquadFilter();
      video.voiceFilter.type = 'highpass';
      video.voiceFilter.frequency.value = 1000;
      video.bassFilter = audioContext.createBiquadFilter();
      video.bassFilter.type = 'lowshelf';
      video.bassFilter.frequency.value = 200;
      video.bassFilter.gain.value = 15;

      source.connect(gainNode);
      gainNode.connect(video.voiceFilter);
      video.voiceFilter.connect(video.bassFilter);
      video.bassFilter.connect(audioContext.destination);
      video.gainNode = gainNode;
      video.audioContext = audioContext;
    }
    const volumeValue = Math.min(1, volume / 100); // Normal volume range
    const gainValue = volume > 100 ? volume / 100 : 1; // Gain value for amplification
    video.volume = volumeValue;
    video.gainNode.gain.value = gainValue;

    switch (mode) {
      case 'voice-boost':
        video.voiceFilter.gain.value = 5;
        video.bassFilter.gain.value = 0;
        break;
      case 'bass-boost':
        video.voiceFilter.gain.value = 0;
        video.bassFilter.gain.value = 15;
        break;
      default:
        video.voiceFilter.gain.value = 0;
        video.bassFilter.gain.value = 0;
        break;
    }
  });
}
