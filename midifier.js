const fs = require('fs');
const fftJS = require('fft-js');
const MidiWriter = require('midi-writer-js');
const { Note } = require("tonal");
const { WaveFile } = require('wavefile');

// Code adapted from https://github.com/lowbyteproductions/Making-WAVs/blob/master/index.js
function getDeconstructedWav(filepath) {
	const file = fs.readFileSync(filepath);

	fs.unlink(filepath, (err) => {
	  if (err) {
	    console.error('Error deleting temporary file:', err);
	    return;
	  }
	  console.log(`Temporary file '${filepath}' deleted successfully.`);
	});

	return new WaveFile(file);
}

function runStft(input) {
	let notes = [];
	for(let i = 0; i < input.length-1024; i += 1024) {
		const subinput = input.slice(i, i+1024);

		const phasors = fftJS.fft(subinput);

		const frequencies = fftJS.util.fftFreq(phasors, 8000);
		const magnitudes = fftJS.util.fftMag(phasors);

		const both = frequencies.map(function (f, ix) {
			return {frequency: f, magnitude: magnitudes[ix]};
		});

		let best = 0;
		for(let j = 0; j < both.length; j++) {
			if(Math.sqrt(both[best].frequency) * both[best].magnitude < Math.sqrt(both[j].frequency) * both[j].magnitude) best = j;
		}
		notes.push(both[best]);
	}
	return notes;
}

function generateMidi(input, sampleRate) {
	let track = new MidiWriter.Track();
	track.setTempo(160 / 8);
	for(let i = 0; i < input.length; i++) {
		let noteDur = 1;
		let note = Note.fromFreq(input[i].frequency);
		while(i < input.length-1 && input[i].frequency == input[i+1].frequency) {
			i++;
			noteDur++;
		}
		track.addEvent(new MidiWriter.NoteEvent({pitch: [note], duration: ('T' + noteDur.toString()), velocity:100}));

	}
	let write = new MidiWriter.Writer(track);

	return write.buildFile();
}

module.exports = { getDeconstructedWav, runStft, generateMidi };
