// ==UserScript==
// @name         Plugin Summary
// @namespace    http://tampermonkey.net/
// @version      4.5
// @description  Generate plugin summary for livestream with OpenAI
// @author       You
// @match        https://wordpress.org/plugins/*
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @require      https://cdn.jsdelivr.net/npm/marked/marked.min.js
// @run-at       document-end
// @updateURL    https://raw.githubusercontent.com/chrismalone617/tampermonkey-script--generate-plugin-summary/main/generate-plugin-summary.user.js
// @downloadURL  https://raw.githubusercontent.com/chrismalone617/tampermonkey-script--generate-plugin-summary/main/generate-plugin-summary.user.js
// ==/UserScript==

(async function () {
    'use strict';

    // Function to get the API key from storage or prompt the user for it
    async function getApiKey() {
        let apiKey = await GM_getValue('OPENAI_API_KEY', null);
        if (!apiKey) {
            apiKey = prompt(
                'Please enter your OpenAI API Key. It will be securely stored for this script.'
            );
            if (apiKey) {
                await GM_setValue('OPENAI_API_KEY', apiKey);
                alert('API Key has been saved successfully!');
            } else {
                alert('API Key is required for the script to function.');
            }
        }
        return apiKey;
    }

    // Retrieve the stored (or newly entered) API key
    const OPENAI_API_KEY = await getApiKey();

    // If no API key exists, stop the script
    if (!OPENAI_API_KEY) {
        alert('No API Key found. Exiting script.');
        return;
    }

    // Add styles for the button and popup
    GM_addStyle(`
        #summary-button {
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 10000;
            padding: 10px 20px;
            background-color: #0073AA;
            color: white;
            border: none;
            border-radius: 3px;
            font-size: 16px;
            cursor: pointer;
        }
        #summary-container {
            position: fixed;
            top: 10%;
            left: 10%;
            width: 80%;
            height: 80%;
            background: white;
            z-index: 10001;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
            border-radius: 8px;
            overflow-y: auto;
            display: none;
            padding: 20px;
        }
        #summary-content {
            margin-top: 20px;
            line-height: 1.6;
        }
        .summary-close {
            position: absolute;
            top: 10px;
            right: 20px;
            cursor: pointer;
            font-size: 20px;
            color: #333;
        }
    `);

    // Add the "Plugin Summary" button to the page
    const button = document.createElement('button');
    button.id = 'summary-button';
    button.textContent = 'Generate Plugin Summary';
    document.body.appendChild(button);

    // Create the popup container
    const container = document.createElement('div');
    container.id = 'summary-container';
    container.innerHTML = `
        <span class="summary-close">×</span>
        <h2>Plugin Summary</h2>
        <div id="summary-content">Generating summary...</div>
    `;
    document.body.appendChild(container);

    // Close popup functionality
    document.querySelector('.summary-close').onclick = () => {
        container.style.display = 'none';
    };

    // Function to call OpenAI API and generate a summary
    async function generateSummary(apiKey, prompt) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'POST',
                url: 'https://api.openai.com/v1/chat/completions',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                },
                data: JSON.stringify({
                    model: 'gpt-4o', // Use GPT-4 by default
                    messages: [{ role: 'user', content: prompt }],
                    max_tokens: 500,
                }),
                onload: function (response) {
                    const data = JSON.parse(response.responseText);
                    if (data.choices && data.choices[0]?.message?.content) {
                        resolve(data.choices[0].message.content.trim());
                    } else {
                        reject(new Error('Failed to generate summary. Check API response.'));
                    }
                },
                onerror: function (err) {
                    reject(new Error('Failed to connect to OpenAI API.'));
                },
            });
        });
    }

    // Trigger plugin summary generation when the button is clicked
    button.onclick = async () => {
        const pluginTitle = document.querySelector('h1.plugin-title')?.textContent?.trim() || 'Unknown Plugin';
        const authorElement = document.querySelector('.author.vcard a.url.fn.n');
        const author = authorElement ? authorElement.textContent.trim() : 'Unknown Author';
        const repositoryUrl = window.location.href;

        // Get icon URL from srcset attribute
        const iconImg = document.querySelector('img.plugin-icon');
        const iconUrl = iconImg ? (iconImg.getAttribute('src') || '').split('?')[0] : 'No image found';

        // Get download URL
        const downloadLink = document.querySelector('.plugin-download a');
        const downloadUrl = downloadLink ? downloadLink.href : 'No download link found';

        // RESTORING YOUR CUSTOM PROMPT FORMATTING
        const prompt = `
I need the information about this plugin for a livestream. I need:

Plugin Title: ${pluginTitle}

Plugin Author: ${author}

Link to Repository Page: ${repositoryUrl}

Image Icon: ${iconUrl}

Download Link: ${downloadUrl}

And a 5-6 bullet point summary of what the plugin does. If there is a pro version of the plugin, give an extra bullet point summarizing what the pro version offers in a few words.`;

        container.style.display = 'block';

        try {
            const summary = await generateSummary(OPENAI_API_KEY, prompt);
            document.getElementById('summary-content').innerHTML = marked.parse(summary);
        } catch (error) {
            document.getElementById('summary-content').innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
        }
    };
})();
