const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Keep track of the current view's center month
let currentViewMonth;
let currentViewYear;
let releasesByDateGlobal;
let futureMilestonesGlobal = {};

function generateMonth(year, month, getMilestoneInfo) {
  const container = document.createElement('div');
  container.classList.add('month');
  container.setAttribute('data-month', `${year}-${month}`);

  const header = document.createElement('div');
  header.classList.add('month_row', 'header');
  container.appendChild(header);

  const monthName = document.createElement('h3');
  monthName.innerText = `${months[month - 1]} ${year}`;
  header.appendChild(monthName);

  const dayRow = document.createElement('div');
  dayRow.classList.add('month_row', 'day_row');
  container.appendChild(dayRow);

  for (let i = 0; i < 7; i++) {
    const day = document.createElement('div');
    day.classList.add('month_day');
    day.innerText = days[i];
    dayRow.appendChild(day);
  }

  const today = new Date();
  const firstDay = new Date(year, month - 1, 1);
  const offset = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;

  for (let week = 0; week < 6; week++) {
    const row = document.createElement('div');
    row.classList.add('month_row');
    container.appendChild(row);

    for (let day = 0; day < 7; day++) {
      const n = week * 7 + day - offset + 1;
      const currentDay = new Date(year, month - 1, n);

      const valid = n > 0 && currentDay.getMonth() === month - 1;
      const future = currentDay.getTime() > today.getTime();
      const isToday = valid && 
        currentDay.getDate() === today.getDate() && 
        currentDay.getMonth() === today.getMonth() && 
        currentDay.getFullYear() === today.getFullYear();

      const cell = document.createElement('div');
      cell.classList.add('month_day');
      if (future) {
        cell.classList.add('future');
      }
      if (isToday) {
        cell.classList.add('today');
      }
      cell.innerText = valid ? `${n}` : '';
      
      // Format date string properly with padding
      const formattedMonth = month.toString().padStart(2, '0');
      const formattedDay = n.toString().padStart(2, '0');
      const dateString = valid ? `${year}-${formattedMonth}-${formattedDay}` : '';
      cell.setAttribute('data-date', dateString);

      const info = document.createElement('div');
      info.classList.add('info');
      cell.appendChild(info);

      if (valid && dateString) {
        // Get both past releases and future milestones for this date
        const releases = getMilestoneInfo(dateString);
        const futureMilestones = futureMilestonesGlobal[dateString] || [];
        
        // Combine and process them
        if ((releases && releases.length > 0) || (futureMilestones && futureMilestones.length > 0)) {
          cell.classList.add('has-milestone');
          
          const tooltip = document.createElement('div');
          tooltip.classList.add('milestone-tooltip');
          
          // Collect all unique channels across all releases and future milestones
          const uniqueChannels = new Set();
          
          // Track versions by channel for tooltip
          const versionsByChannel = {
            stable: new Set(),
            beta: new Set(),
            dev: new Set(),
            canary: new Set()
          };
          
          // Process past releases
          if (releases && releases.length > 0) {
            releases.forEach(release => {
              release.channels.forEach(channel => {
                const lowerChannel = channel.toLowerCase();
                
                // Skip extended channels and normalize canary asan to canary
                if (lowerChannel.includes('extended')) {
                  return;
                }
                
                const normalizedChannel = lowerChannel === 'canary asan' ? 'canary' : lowerChannel;
                
                // Only add recognized channels
                if (['stable', 'beta', 'dev', 'canary'].includes(normalizedChannel)) {
                  // Add to unique channels
                  uniqueChannels.add(normalizedChannel);
                  
                  // Track version info for tooltip
                  if (versionsByChannel[normalizedChannel]) {
                    versionsByChannel[normalizedChannel].add(`${release.version} (M${release.milestone})`);
                  }
                }
              });
            });
          }
          
          // Process future milestones
          if (futureMilestones && futureMilestones.length > 0) {
            futureMilestones.forEach(milestone => {
              const channel = milestone.channel.toLowerCase();
              
              if (['stable', 'beta'].includes(channel)) {
                // Add to unique channels
                uniqueChannels.add(channel);
                
                // Add milestone to versions with special formatting to indicate it's future
                if (versionsByChannel[channel]) {
                  versionsByChannel[channel].add(`M${milestone.milestone} (Planned)`);
                }
              }
            });
          }
          
          // Create tooltip content
          let tooltipContent = '';
          for (const channel of ['stable', 'beta', 'dev', 'canary']) {
            if (versionsByChannel[channel] && versionsByChannel[channel].size > 0) {
              if (tooltipContent) tooltipContent += '<hr>';
              const versions = [...versionsByChannel[channel]].join(', ');
              tooltipContent += `<b>${channel.charAt(0).toUpperCase() + channel.slice(1)}</b>: ${versions}`;
            }
          }
          
          tooltip.innerHTML = tooltipContent;
          cell.appendChild(tooltip);
          
          // Sort channels for consistent display order
          const channelOrder = ['stable', 'beta', 'dev', 'canary'];
          const sortedChannels = [...uniqueChannels].sort((a, b) => {
            const orderA = channelOrder.indexOf(a);
            const orderB = channelOrder.indexOf(b);
            return orderA - orderB;
          });
          
          // Create one dot per channel type
          sortedChannels.forEach(channel => {
            const indicator = document.createElement('span');
            indicator.classList.add('channel-dot');
            
            // Check if this is a future milestone
            const hasFutureMilestone = futureMilestones.some(m => m.channel.toLowerCase() === channel);
            if (hasFutureMilestone) {
              indicator.classList.add('future-milestone');
            }
            
            indicator.setAttribute('data-channel', channel);
            
            switch(channel) {
              case 'stable':
                indicator.style.backgroundColor = '#77ADFF'; // Lighter blue
                break;
              case 'beta':
                indicator.style.backgroundColor = '#66D99F'; // Lighter green
                break;
              case 'dev':
                indicator.style.backgroundColor = '#FF8A80'; // Lighter red
                break;
              case 'canary':
                indicator.style.backgroundColor = '#FFD180'; // Lighter yellow
                break;
            }
            
            info.appendChild(indicator);
          });
        }
      }

      row.appendChild(cell);
    }
  }

  return container;
}

// Create navigation controls
function createNavigation() {
  const nav = document.createElement('div');
  nav.classList.add('calendar-navigation');
  
  const prevBtn = document.createElement('button');
  prevBtn.innerHTML = '&larr;';
  prevBtn.classList.add('nav-button', 'prev');
  prevBtn.setAttribute('aria-label', 'Previous months');
  prevBtn.addEventListener('click', navigatePrevious);
  
  const nextBtn = document.createElement('button');
  nextBtn.innerHTML = '&rarr;';
  nextBtn.classList.add('nav-button', 'next');
  nextBtn.setAttribute('aria-label', 'Next months');
  nextBtn.addEventListener('click', navigateNext);
  
  const currentPeriod = document.createElement('div');
  currentPeriod.classList.add('current-period');
  updateCurrentPeriodText(currentPeriod);
  
  nav.appendChild(prevBtn);
  nav.appendChild(currentPeriod);
  nav.appendChild(nextBtn);
  
  return nav;
}

// Update the text showing current view period
function updateCurrentPeriodText(element) {
  if (!element) {
    element = document.querySelector('.current-period');
    if (!element) return;
  }
  
  const nextMonth = currentViewMonth + 1 > 12 ? 1 : currentViewMonth + 1;
  const nextYear = currentViewMonth + 1 > 12 ? currentViewYear + 1 : currentViewYear;
  
  element.textContent = `${months[currentViewMonth-1]} ${currentViewYear} - ${months[nextMonth-1]} ${nextYear}`;
}

// Navigate to previous 3 months
function navigatePrevious() {
  currentViewMonth -= 1;
  if (currentViewMonth < 1) {
    currentViewMonth += 12;
    currentViewYear--;
  }
  renderCalendar();
}

// Navigate to next 3 months
function navigateNext() {
  currentViewMonth += 1;
  if (currentViewMonth > 12) {
    currentViewMonth -= 12;
    currentViewYear++;
  }
  renderCalendar();
}

// Render the calendar with the current view settings
function renderCalendar() {
  const calendarSection = document.querySelector('.chromium-calendar');
  calendarSection.innerHTML = '';
  
  // Next month
  let nextMonth = currentViewMonth + 1;
  let nextYear = currentViewYear;
  if (nextMonth > 12) {
    nextMonth -= 12;
    nextYear++;
  }
  
  // Add the 2 months (current and next)
  calendarSection.appendChild(
    generateMonth(currentViewYear, currentViewMonth, (dateString) => {
      return releasesByDateGlobal[dateString] || [];
    })
  );
  
  calendarSection.appendChild(
    generateMonth(nextYear, nextMonth, (dateString) => {
      return releasesByDateGlobal[dateString] || [];
    })
  );
  
  // Update the navigation period text
  updateCurrentPeriodText();
}

// Fetch future milestone data from Chromium dashboard
async function fetchFutureMilestones() {
  try {
    // First fetch the latest milestone
    const response = await fetch('https://chromiumdash.appspot.com/fetch_milestone_schedule');
    if (!response.ok) {
      throw new Error(`Failed to fetch latest milestone: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.mstones || data.mstones.length === 0) {
      throw new Error('No milestone data received');
    }
    
    // Get the current milestone number
    const currentMstone = data.mstones[0].mstone;
    console.log(`Current milestone: ${currentMstone}`);
    
    // Process the milestones data into a date-indexed format
    const milestonesObj = {};
    
    // Add the current milestone data
    processMilestoneData(data.mstones[0], milestonesObj);
    
    // Fetch and process the next 10 milestones
    const nextMilestones = [];
    for (let i = 1; i <= 10; i++) {
      const nextMstone = currentMstone + i;
      console.log(`Fetching milestone: ${nextMstone}`);
      
      try {
        const nextMilestoneResponse = await fetch(`https://chromiumdash.appspot.com/fetch_milestone_schedule?mstone=${nextMstone}`);
        if (nextMilestoneResponse.ok) {
          const nextMilestoneData = await nextMilestoneResponse.json();
          if (nextMilestoneData.mstones && nextMilestoneData.mstones.length > 0) {
            processMilestoneData(nextMilestoneData.mstones[0], milestonesObj);
            nextMilestones.push(nextMilestoneData.mstones[0]);
          }
        }
      } catch (err) {
        console.log(`Error fetching milestone ${nextMstone}:`, err);
        // Continue with other milestones even if one fails
      }
    }
    
    console.log(`Fetched ${nextMilestones.length} future milestones`);
    return milestonesObj;
  } catch (error) {
    console.error('Error fetching future milestones:', error);
    return {};
  }
}

// Helper function to process milestone data
function processMilestoneData(milestone, milestonesObj) {
  // Add earliest beta date
  if (milestone.earliest_beta) {
    const betaDate = milestone.earliest_beta.split('T')[0]; // Get just the date part
    if (!milestonesObj[betaDate]) {
      milestonesObj[betaDate] = [];
    }
    milestonesObj[betaDate].push({
      milestone: milestone.mstone,
      channel: 'beta',
      version: `M${milestone.mstone}`,
      isFutureMilestone: true
    });
  }
  
  // Add stable date
  if (milestone.stable_date) {
    const stableDate = milestone.stable_date.split('T')[0]; // Get just the date part
    if (!milestonesObj[stableDate]) {
      milestonesObj[stableDate] = [];
    }
    milestonesObj[stableDate].push({
      milestone: milestone.mstone,
      channel: 'stable',
      version: `M${milestone.mstone}`,
      isFutureMilestone: true
    });
  }
}

async function main() {
  try {
    // Use our API endpoint instead of fetching directly from Chromium
    const response = await fetch('/chromium/data.json');
    if (!response.ok) {
      throw new Error(`Failed to fetch Chromium releases: ${response.statusText}`);
    }
    
    releasesByDateGlobal = await response.json();
    
    // Fetch future milestones
    futureMilestonesGlobal = await fetchFutureMilestones();
    
    const calendarContainer = document.querySelector('.chromium-calendar').parentElement;
    
    // Create navigation controls
    const navControls = createNavigation();
    calendarContainer.insertBefore(navControls, calendarContainer.firstChild);
    
    // Set current date as the center month
    const now = new Date();
    currentViewMonth = now.getMonth() + 1; // 1-based month
    currentViewYear = now.getFullYear();
    
    // Initial render
    renderCalendar();
    
  } catch (error) {
    console.error('Error loading Chromium releases data:', error);
    document.querySelector('.chromium-calendar').innerHTML = 
      `<div class="error-message">Failed to load Chromium releases data: ${error.message}</div>`;
  }
}

document.addEventListener('DOMContentLoaded', main);