const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Keep track of the current view's center month
let currentViewMonth;
let currentViewYear;
let releasesByDateGlobal;

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
        const releases = getMilestoneInfo(dateString);
        
        if (releases && releases.length > 0) {
          cell.classList.add('has-milestone');
          
          const tooltip = document.createElement('div');
          tooltip.classList.add('milestone-tooltip');
          
          // Create tooltip content with all versions organized by channel
          const tooltipContent = releases.map(release => {
            // Sort channels to maintain consistent order
            const sortedChannels = [...release.channels].sort((a, b) => {
              const order = { 'stable': 1, 'beta': 2, 'dev': 3, 'canary': 4 };
              return (order[a.toLowerCase()] || 999) - (order[b.toLowerCase()] || 999);
            });
            
            const channelsText = sortedChannels.join(', ');
            return `Version ${release.version} (M${release.milestone})<br><span class="channel-list">${channelsText}</span>`;
          }).join('<hr>');
          
          tooltip.innerHTML = tooltipContent;
          cell.appendChild(tooltip);
          
          // Group all channels from all releases
          const allChannels = new Set();
          releases.forEach(release => {
            release.channels.forEach(channel => {
              allChannels.add(channel.toLowerCase());
            });
          });
          
          // Create one dot per channel type
          const channelOrder = ['stable', 'beta', 'dev', 'canary'];
          const sortedChannels = [...allChannels].sort((a, b) => {
            const orderA = channelOrder.indexOf(a);
            const orderB = channelOrder.indexOf(b);
            return orderA - orderB;
          });
          
          sortedChannels.forEach(channel => {
            const indicator = document.createElement('span');
            indicator.classList.add('channel-dot');
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
  
  const prevMonth = currentViewMonth - 1 < 1 ? 12 : currentViewMonth - 1;
  const prevYear = currentViewMonth - 1 < 1 ? currentViewYear - 1 : currentViewYear;
  
  const nextMonth = currentViewMonth + 1 > 12 ? 1 : currentViewMonth + 1;
  const nextYear = currentViewMonth + 1 > 12 ? currentViewYear + 1 : currentViewYear;
  
  element.textContent = `${months[prevMonth-1]} ${prevYear} - ${months[nextMonth-1]} ${nextYear}`;
}

// Navigate to previous 3 months
function navigatePrevious() {
  currentViewMonth -= 3;
  if (currentViewMonth < 1) {
    currentViewMonth += 12;
    currentViewYear--;
  }
  renderCalendar();
}

// Navigate to next 3 months
function navigateNext() {
  currentViewMonth += 3;
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
  
  // Previous month
  let prevMonth = currentViewMonth - 1;
  let prevYear = currentViewYear;
  if (prevMonth < 1) {
    prevMonth += 12;
    prevYear--;
  }
  
  // Next month
  let nextMonth = currentViewMonth + 1;
  let nextYear = currentViewYear;
  if (nextMonth > 12) {
    nextMonth -= 12;
    nextYear++;
  }
  
  // Add the 3 months
  calendarSection.appendChild(
    generateMonth(prevYear, prevMonth, (dateString) => {
      return releasesByDateGlobal[dateString] || [];
    })
  );
  
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

async function main() {
  try {
    // Use our API endpoint instead of fetching directly from Chromium
    const response = await fetch('/chromium/data.json');
    if (!response.ok) {
      throw new Error(`Failed to fetch Chromium releases: ${response.statusText}`);
    }
    
    releasesByDateGlobal = await response.json();
    
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