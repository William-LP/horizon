import { Motion } from "@capacitor/motion";
import type React from "react";
import { useEffect, useState } from "react";

const App: React.FC = () => {
	const [beepSpeed, setBeepSpeed] = useState(0);
	const [angle, setAngle] = useState(0); // State to store the tilt angle
	const [orientation, setOrientation] = useState(""); // State to store the direction (left or right)
	const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
	const [isStarted, setIsStarted] = useState(false);

	// Define angle thresholds with 5° gaps, including 0°
	const angleThresholds = [
		0,
		...Array.from({ length: 18 }, (_, i) => (i + 1) * 5),
	]; // [0, 5, 10, 15, ..., 90]

	// Function to initialize the AudioContext with user interaction
	const initializeAudioContext = () => {
		const context = new (
			window.AudioContext || (window as any).webkitAudioContext
		)();
		setAudioContext(context);
		setIsStarted(true); // This flag starts gyroscope event listening
	};

	useEffect(() => {
		if (isStarted) {
			// Only start motion detection after user interaction
			const checkGyroscope = async () => {
				await Motion.addListener("accel", (event) => {
					const { x } = event.accelerationIncludingGravity;

					// Calculate the tilt angle (in degrees) from the x-axis value
					const calculatedAngle = Math.atan2(x, 9.81) * (180 / Math.PI); // Assuming gravity is 9.81 m/s²

					// Detect left or right tilts based on x-axis
					const leftTilt = x > 0;
					const rightTilt = x < 0;

					// Update the orientation and the angle
					if (leftTilt) {
						setOrientation("Left");
					} else if (rightTilt) {
						setOrientation("Right");
					} else {
						setOrientation("");
					}

					const absoluteAngle = Math.abs(calculatedAngle);
					setAngle(absoluteAngle); // Store the absolute value of the angle

					// Set beep frequency based on thresholds
					let newBeepSpeed = 0;
					for (let i = 0; i < angleThresholds.length; i++) {
						if (absoluteAngle >= angleThresholds[i]) {
							newBeepSpeed = (i + 1) * 10; // Adjust beep speed incrementally
						}
					}

					// Reduce the beep frequency by a factor of 10
					if (leftTilt || rightTilt) {
						setBeepSpeed(newBeepSpeed / 10); // Dividing beep speed by 10
					} else {
						setBeepSpeed(0);
					}
				});
			};

			checkGyroscope();

			return () => {
				Motion.removeAllListeners();
			};
		}
	}, [isStarted]);

	useEffect(() => {
		let interval: NodeJS.Timeout;

		if (beepSpeed > 0) {
			interval = setInterval(() => {
				playBeep();
			}, 1000 / beepSpeed); // Reduced beep speed for a smoother experience
		}

		return () => {
			if (interval) clearInterval(interval);
		};
	}, [beepSpeed]);

	// Function to play a beep sound with different pitches
	const playBeep = () => {
		if (audioContext) {
			const oscillator = audioContext.createOscillator();
			const gainNode = audioContext.createGain();

			oscillator.type = "sine";
			// Set different frequencies for left and right tilts
			const frequency = orientation === "Left" ? 440 : 880; // 440 Hz for low pitch, 880 Hz for high pitch
			oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime); // Set frequency based on orientation
			gainNode.gain.setValueAtTime(1, audioContext.currentTime); // Volume of the beep

			// Connect the oscillator to the gain and the destination (speakers)
			oscillator.connect(gainNode);
			gainNode.connect(audioContext.destination);

			oscillator.start();
			setTimeout(() => {
				oscillator.stop();
			}, 100); // Duration of the beep (100 ms)
		}
	};

	return (
		<div className="container">
			<h1>Sound Horizon</h1>
			{!isStarted && (
				<button onClick={initializeAudioContext}>
					Start Gyroscope & Sound
				</button>
			)}
			{isStarted && (
				<div>
					<p>Current beep speed: {beepSpeed.toFixed(2)}</p>
					<p>
						Orientation: {orientation} {angle.toFixed(2)}°
					</p>{" "}
					{/* Display the orientation and angle */}
				</div>
			)}
		</div>
	);
};

export default App;
