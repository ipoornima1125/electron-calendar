const express = require('express');
const router = express.Router();
const a = require('../utils/a');
const path = require('path');
const fs = require('fs').promises;

// Cache file path
const CACHE_FILE = path.join(__dirname, '..', '..', 'cache', 'chromium-releases.json');

// Ensure cache directory exists
async function ensureCacheDir() {
  const cacheDir = path.dirname(CACHE_FILE);
  try {
    await fs.mkdir(cacheDir, { recursive: true });
  } catch (err) {
    if (err.code !== 'EEXIST') throw err;
  }
}

async function fetchWithRetry(url, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0.4472.124'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP Error ${response.status} - ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Attempt ${attempt} failed: ${error.message}`);
      if (attempt === retries) throw error;
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }
}

// Fetch Chromium releases data
async function fetchChromiumReleases() {
  try {
    // Check if cache exists and is less than 1 hour old
    try {
      const stats = await fs.stat(CACHE_FILE);
      const cacheAge = Date.now() - stats.mtimeMs;
      
      // If cache is less than 1 hour old, use it
      if (cacheAge < 60 * 60 * 1000) {
        const cacheData = await fs.readFile(CACHE_FILE, 'utf8');
        return JSON.parse(cacheData);
      }
    } catch (err) {
      console.log('Cache not available, fetching fresh data');
    }

    // Fetch fresh data
    const releases = await fetchWithRetry('https://chromiumdash.appspot.com/fetch_releases');
    
    // Process the releases data
    const processedReleases = releases
      // Filter out incomplete or malformed entries
      .filter(release => 
        release.version && 
        release.channel && 
        release.milestone && 
        release.time
      )
      // Map to our format
      .map(release => ({
        channel: release.channel,
        version: release.version,
        milestone: release.milestone,
        date: new Date(release.time).toISOString().split('T')[0],
        timestamp: release.time
      }));

    // Group by date and deduplicate
    const releasesByDate = {};
    processedReleases.forEach(release => {
      if (!releasesByDate[release.date]) {
        releasesByDate[release.date] = new Map();
      }
      const key = `${release.channel}-${release.version}`;
      if (!releasesByDate[release.date].has(key)) {
        releasesByDate[release.date].set(key, release);
      }
    });

    // Convert Map back to array for each date
    const finalReleases = {};
    Object.entries(releasesByDate).forEach(([date, releasesMap]) => {
      finalReleases[date] = Array.from(releasesMap.values());
    });

    // Save to cache
    await ensureCacheDir();
    await fs.writeFile(CACHE_FILE, JSON.stringify(finalReleases, null, 2));
    
    return finalReleases;
  } catch (error) {
    console.error('Error fetching Chromium releases:', error);
    
    // Try to use cache as fallback even if it's old
    try {
      const cacheData = await fs.readFile(CACHE_FILE, 'utf8');
      return JSON.parse(cacheData);
    } catch (err) {
      // No cache available
      return [];
    }
  }
}
// Route to render the Chromium releases page
router.get('/', a(async (req, res) => {
  res.render('chromium', {
    title: 'Chromium Release Calendar',
    css: 'chromium'
  });
}));

// API endpoint to get Chromium releases data
router.get('/data.json', a(async (req, res) => {
  try {
    res.setHeader('Access-Control-Allow-Origin', '*');
    const releases = await fetchChromiumReleases();
    
    // Group releases by date for easier calendar processing
    const releasesByDate = {};
    releases.forEach(release => {
      if (!releasesByDate[release.date]) {
        releasesByDate[release.date] = [];
      }
      releasesByDate[release.date].push(release);
    });
    
    res.json(releasesByDate);
  } catch (error) {
    console.error('Error serving releases data:', error);
    res.status(500).json({ error: 'Failed to fetch release data' });
  }
}));

module.exports = router;