require('dotenv').config();

let http = require('http');
let formidable = require('formidable');
let midifier = require('./midifier.js');

const port = process.env.PORT;

http.createServer(async function (req, res) {
	if (req.method === 'POST') {
		let form = new formidable.IncomingForm();
			
		let fields;
		let files;
		try {
			[fields, files] = await form.parse(req);
		} catch (err) {
			console.error(err);
			res.writeHead(err.httpCode || 400, { 'Content-Type': 'text/plain' });
			res.end(String(err));
			return;
		}
		const filename = files.filetoupload[0].originalFilename;
		const filePath = files.filetoupload[0].filepath;
		console.log(filePath);
		let wav;
		try {
			wav = midifier.getDeconstructedWav(filePath);

			// Extract data and combine into single channel
			const audioData = wav.getSamples();
			let fileData = [];
			for(let i = 0; i < audioData[0].length; i++) {
				fileData.push(0);
				for(let j = 0; j < wav.fmt.numChannels ; j++) {
					fileData[i] += audioData[j][i];
				}
				fileData[i] /= wav.fmt.numChannels;
			}
			
			let fftData = midifier.runStft(fileData);
			let midi = midifier.generateMidi(fftData, wav.sampleRate);
			res.setHeader('Content-Type', 'audio/midi');
			res.setHeader('Content-Disposition', `attachment; filename="${filename}.midi"`);
			res.writeHead(200);
			res.write(midi);
			res.end();
			return;
		} catch (err) {
			console.error(err);
			res.writeHead(err.httpCode || 400, { 'Content-Type': 'text/plain' });
			res.end(String(err));
			return;
		}
	} else {
		res.write('method not allowed');
		return res.end();
	}
}).listen(port);

