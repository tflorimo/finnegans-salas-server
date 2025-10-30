import { google } from "googleapis";
import fs from "fs";
import path from "path";

const CREDENTIALS_PATH = path.join(__dirname, "../../credentials.json");
const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, "utf8"));

export const oauth2Client = new google.auth.OAuth2(
  credentials.web.client_id,
  credentials.web.client_secret,
  credentials.web.redirect_uris[0]
);
