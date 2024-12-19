document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const audioPlayer = document.getElementById('audio-player');
    const backgroundImage = document.getElementById('backgroundImage');
    let audioContext;
    let analyser;
    let dataArray;
    const loadingContainer = document.querySelector('.loading-container');
    const loadingProgress = document.querySelector('.loading-progress');
    
    // Set canvas size
    canvas.width = 600;
    canvas.height = 300;

    document.getElementById('uploadForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Show loading
        loadingContainer.style.display = 'flex';
        loadingProgress.style.width = '30%';
        
        const formData = new FormData();
        formData.append('audio', document.getElementById('audio').files[0]);
        formData.append('image', document.getElementById('image').files[0]);
        
        try {
            loadingProgress.style.width = '60%';
            const response = await fetch('/upload', {
                method: 'POST',
                body: formData
            });
            
            loadingProgress.style.width = '90%';
            const data = await response.json();
            
            if (data.success) {
                // Load background image
                backgroundImage.src = data.imagePath;
                // Load audio
                audioPlayer.src = data.audioPath;
                
                // Initialize audio context when user interacts
                audioPlayer.addEventListener('play', initializeAudio);
            }
            
            // Hide loading
            setTimeout(() => {
                loadingProgress.style.width = '100%';
                setTimeout(() => {
                    loadingContainer.style.display = 'none';
                    loadingProgress.style.width = '0%';
                }, 200);
            }, 200);
        } catch (error) {
            console.error('Error:', error);
            loadingContainer.style.display = 'none';
            loadingProgress.style.width = '0%';
        }
    });

    function initializeAudio() {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            analyser = audioContext.createAnalyser();
            const source = audioContext.createMediaElementSource(audioPlayer);
            
            source.connect(analyser);
            analyser.connect(audioContext.destination);
            
            analyser.fftSize = 256;
            const bufferLength = analyser.frequencyBinCount;
            dataArray = new Uint8Array(bufferLength);
            
            draw();
        }
    }

    function draw() {
        requestAnimationFrame(draw);
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw background image
        if (backgroundImage.complete) {
            ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);
        }
        
        if (!analyser) return;
        
        analyser.getByteFrequencyData(dataArray);
        
        const barWidth = (canvas.width / dataArray.length) * 2.5;
        let barHeight;
        let x = 0;
        
        for (let i = 0; i < dataArray.length; i++) {
            barHeight = dataArray[i] * 1.5;
            
            // Create gradient
            const gradient = ctx.createLinearGradient(0, canvas.height, 0, canvas.height - barHeight);
            gradient.addColorStop(0, '#00ff00');
            gradient.addColorStop(1, '#ff0000');
            
            ctx.fillStyle = gradient;
            ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
            
            x += barWidth + 1;
        }
    }
}); 