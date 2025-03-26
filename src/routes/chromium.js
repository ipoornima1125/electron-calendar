const express = require('express');
const router = express.Router();
const a = require('../utils/a');
const path = require('path');
const fs = require('fs').promises;

// Cache file path
const CACHE_FILE = path.join(__dirname, '..', '..', 'cache', 'chromium-milestones.json');

// Ensure cache directory exists
async function ensureCacheDir() {
  const cacheDir = path.dirname(CACHE_FILE);
  try {
    await fs.mkdir(cacheDir, { recursive: true });
  } catch (err) {
    if (err.code !== 'EEXIST') throw err;
  }
}

// Fetch Chromium milestones data
async function fetchChromiumMilestones() {
  try {
    // Check if cache exists and is less than 24 hours old
    try {
      const stats = await fs.stat(CACHE_FILE);
      const cacheAge = Date.now() - stats.mtimeMs;
      
      // If cache is less than 24 hours old, use it
      if (cacheAge < 24 * 60 * 60 * 1000) {
        const cacheData = await fs.readFile(CACHE_FILE, 'utf8');
        return JSON.parse(cacheData);
      }
    } catch (err) {
      // Cache doesn't exist or can't be read, continue to fetch
      console.log('Cache not available, fetching fresh data');
    }

    // Add browser-like headers to the request
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Accept': 'application/json',
      'Accept-Language': 'en-US,en;q=0.9'
    };

    // First, get the latest milestone to determine the range
    const latestResponse = await fetch('https://chromiumdash.appspot.com/fetch_milestone_schedule', {
      headers
    });
    
    if (!latestResponse.ok) {
      throw new Error(`Failed to fetch latest milestone: ${latestResponse.statusText}`);
    }
    
    const latestData = await latestResponse.json();
    const latestMilestone = Math.max(...latestData.mstones.map(m => parseInt(m.mstone)));
    
    console.log(`Latest Chromium milestone: ${latestMilestone}`);
    
    // Fetch data for milestones from 80 to latest+5
    const startMilestone = 80; // Starting from a reasonable milestone
    const endMilestone = latestMilestone + 5;
    
    const allMilestones = [];
    
    for (let mstone = startMilestone; mstone <= endMilestone; mstone++) {
      try {
        const response = await fetch(`https://chromiumdash.appspot.com/fetch_milestone_schedule?mstone=${mstone}`, {
          headers
        });
        
        if (!response.ok) {
          console.log(`Skipping milestone ${mstone}: ${response.statusText}`);
          continue;
        }
        
        const data = await response.json();
        if (data && data.mstones && data.mstones.length > 0) {
          allMilestones.push(...data.mstones);
        }
        
        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Error fetching milestone ${mstone}:`, error);
      }
    }
    
    // Format the data for our needs
    const formattedData = formatMilestoneData(allMilestones);
    
    // Save to cache
    await ensureCacheDir();
    await fs.writeFile(CACHE_FILE, JSON.stringify(formattedData, null, 2));
    
    return formattedData;
  } catch (error) {
    console.error('Error fetching Chromium milestone data:', error);
    
    // Try to use cache as fallback even if it's old
    try {
      const cacheData = await fs.readFile(CACHE_FILE, 'utf8');
      return JSON.parse(cacheData);
    } catch (err) {
      // No cache available
      return {};
    }
  }
}

// Format milestone data for our calendar
function formatMilestoneData(milestones) {
  const formattedData = {};
  
  milestones.forEach(milestone => {
    // Process stable dates
    if (milestone.stable_date) {
      const date = new Date(milestone.stable_date);
      const dateString = date.toISOString().split('T')[0];
      
      if (!formattedData[dateString]) {
        formattedData[dateString] = [];
      }
      
      formattedData[dateString].push({
        mstone: milestone.mstone,
        channel: 'stable',
        version: `${milestone.mstone}.0.0.0`,
        date: dateString
      });
    }
    
    // Process beta dates
    if (milestone.earliest_beta) {
      const date = new Date(milestone.earliest_beta);
      const dateString = date.toISOString().split('T')[0];
      
      if (!formattedData[dateString]) {
        formattedData[dateString] = [];
      }
      
      formattedData[dateString].push({
        mstone: milestone.mstone,
        channel: 'beta',
        version: `${milestone.mstone}.0.0.0-beta`,
        date: dateString
      });
    }
  });
  
  return formattedData;
}

// Route to render the Chromium releases page
router.get('/', a(async (req, res) => {
  res.render('chromium', {
    title: 'Chromium Releases',
    css: 'chromium'
  });
}));

// API endpoint to get Chromium milestone data
router.get('/data.json', a(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const data = await fetchChromiumMilestones();
  res.json(data);
}));

module.exports = router;