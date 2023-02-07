import https from 'https';
import http from'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';

import { createAccountProfile } from './modules/wallet.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.port || 4001;

app.use(express.json());
app.use(bodyParser.json());
app.use("/", express.static(path.join(__dirname, "../../client/public"))); // To be used in localhost ONLY
app.use(cors({
    origin: ['https://localhost:4000','https://192.168.0.112:4000']
}));

app.get("/create-acount-profile", async (req, res) => {
    const wallet = await createAccountProfile("9962589489");

    res.json({
        status: "Account created successfully",
        wallet,
    });
});

const options = {
    key: fs.readFileSync(__dirname + '\\test\\fixtures\\keys\\client-key.pem'),
    cert: fs.readFileSync(__dirname + '\\test\\fixtures\\keys\\client-cert.pem'),
};

// Create an HTTP service.
http.createServer(app).listen(port);
// Create an HTTPS service identical to the HTTP service.
https.createServer(options, app).listen(443);
