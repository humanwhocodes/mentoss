/**
 * @fileoverview Script to make a social post about the latest release.
 * @author Nicholas C. Zakas
 */

/* globals fetch */

//-----------------------------------------------------------------------------
// Imports
//-----------------------------------------------------------------------------

import OpenAI from "openai";

//-----------------------------------------------------------------------------
// Data
//-----------------------------------------------------------------------------

const REPO = "humanwhocodes/mentoss";
const GITHUB_API = "https://api.github.com/repos";
const SYSTEM_PROMPT = `You are a social media manager for a software project.
Your job is to create engaging social media posts about the project.
You will be provided with the release notes for a new version of the software
in Markdown format. Create a social media post in plain text that summarizes the release notes
and encourages people to check out the new version of the software. The post
should be no more than 280 characters. The post should begin with a short sentence
including the name of the project and the new version number, followed by an empty line, followed by
bullet points summarizing the release notes (the bullets should each begin with an appropriate emoji,
and you should prioritize features over bug fixes when there isn't enough room),
followed by an empty line, and end with one short sentence and the link to the new release (no emoji, just the URL).
The tone should be professional but friendly. Do not use exclamation points,
hashtags, or the word "we".`;

//-----------------------------------------------------------------------------
// Helpers
//-----------------------------------------------------------------------------

const openai = new OpenAI({
	apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Gets the latest release from GitHub.
 * @returns {Promise<{ html_url: string, tag_name: string, body: string }>} The latest release.
 */
async function getLatestRelease() {
	const response = await fetch(`${GITHUB_API}/${REPO}/releases/latest`);
	if (!response.ok) {
		throw new Error(`HTTP error! status: ${response.status}`);
	}
	return await response.json();
}

/**
 * Generates a tweet summary using OpenAI.
 * @param {string} version The version number.
 * @param {string} releaseNotes The release notes to summarize.
 * @param {string} url The URL to the release.
 * @returns {Promise<string>} The generated tweet
 */
async function generateSocialPost(version, releaseNotes, url) {
	const completion = await openai.chat.completions.create({
		model: "gpt-4o-mini",
		messages: [
			{ role: "system", content: SYSTEM_PROMPT },
			{
				role: "user",
				content: `Create a post summarizing this release for Mentoss ${version}: ${releaseNotes}\n\nURL is ${url}`,
			},
		],
	});

	return completion.choices[0]?.message?.content;
}

//-----------------------------------------------------------------------------
// Main
//-----------------------------------------------------------------------------

const { html_url: url, tag_name: tagName, body } = await getLatestRelease();
const version = tagName.slice(tagName.indexOf("-") + 1);

const post = await generateSocialPost(version, body, url);

/* eslint-disable-next-line no-console */
console.log(post);
