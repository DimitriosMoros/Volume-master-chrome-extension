document.addEventListener('DOMContentLoaded', function () {
  const slider = document.getElementById('volume-slider');
  const resetButton = document.getElementById('reset-button');
  const modeButtons = document.querySelectorAll('.mode-button');

  // Load saved settings
  const savedVolume = parseInt(localStorage.getItem('volume')) || 100;
  const savedMode = localStorage.getItem('mode') || 'default';

  slider.value = savedVolume;
  document.getElementById(`${savedMode}-button`)?.classList.add('active');

  function updateVolumeAndMode(volume, mode) {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        function: setVolume,
        args: [volume, mode]
      });
    });
  }

  slider.addEventListener('input', function () {
    const volume = parseInt(slider.value);
    localStorage.setItem('volume', volume);
    updateVolumeAndMode(volume, savedMode);
  });

  modeButtons.forEach(button => {
    button.addEventListener('click', function () {
      modeButtons.forEach(btn => btn.classList.remove('active'));
      this.classList.add('active');
      const mode = this.id.replace('-button', '');
      localStorage.setItem('mode', mode);
      updateVolumeAndMode(parseInt(slider.value), mode);
    });
  });

  resetButton.addEventListener('click', function () {
    const resetVolume = 100;
    slider.value = resetVolume;
    localStorage.setItem('volume', resetVolume);
    localStorage.setItem('mode', 'default');

    modeButtons.forEach(btn => btn.classList.remove('active'));
    document.getElementById('default-button')?.classList.add('active');

    updateVolumeAndMode(resetVolume, 'default');
  });
});

function setVolume(volume, mode) {
  const videos = document.querySelectorAll('video');

  videos.forEach(video => {
    if (!video.audioContext) {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContext.createMediaElementSource(video);
      const gainNode = audioContext.createGain();
      const voiceFilter = audioContext.createBiquadFilter();
      const bassFilter = audioContext.createBiquadFilter();

      // Configure filters
      voiceFilter.type = 'highpass';
      voiceFilter.frequency.value = 1000;
      bassFilter.type = 'lowshelf';
      bassFilter.frequency.value = 200;
      bassFilter.gain.value = 0;

      // Connect nodes
      source.connect(gainNode);
      gainNode.connect(voiceFilter);
      voiceFilter.connect(bassFilter);
      bassFilter.connect(audioContext.destination);

      // Store references
      video.audioContext = audioContext;
      video.gainNode = gainNode;
      video.voiceFilter = voiceFilter;
      video.bassFilter = bassFilter;
    }

    const volumeValue = Math.min(1, volume / 100);
    const gainValue = volume > 100 ? volume / 100 : 1;
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
