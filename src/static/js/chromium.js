const months = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function generateMonth(year, month, getMilestoneInfo) {
  const container = document.createElement('div');
  container.classList.add('month');
  container.setAttribute('data-month', `${year}-${month}`);

  const header = document.createElement('div');
  header.classList.add('month_row');
  header.classList.add('header');
  container.appendChild(header);

  const monthName = document.createElement('h3');
  monthName.innerText = `${months[month - 1]} ${year}`;
  header.appendChild(monthName);

  const dayRow = document.createElement('div');
  dayRow.classList.add('month_row');
  dayRow.classList.add('day_row');
  container.appendChild(dayRow);

  for (let i = 0; i < 7; i++) {
    const day = document.createElement('div');
    day.classList.add('month_day');
    day.innerText = days[i];
    dayRow.appendChild(day);
  }

  const today = new Date();
  const firstDay = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const offset = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1; // Adjust for Monday start

  for (let week = 0; week < 6; week++) {
    const row = document.createElement('div');
    row.classList.add('month_row');
    container.appendChild(row);

    for (let day = 0; day < 7; day++) {
      const n = week * 7 + day - offset + 1;
      const currentDay = new Date(year, month - 1, n, 0, 0, 0, 0);

      const valid = n > 0 && currentDay.getMonth() === month - 1;
      const future = currentDay.getTime() > today.getTime();

      const cell = document.createElement('div');
      cell.classList.add('month_day');
      if (future) {
        cell.classList.add('future');
      }
      cell.innerText = valid ? `${n}` : '';
      cell.setAttribute('data-date', `${year}-${month}-${n}`);

      const info = document.createElement('div');
      info.classList.add('info');
      cell.appendChild(info);

      if (valid) {
        const dateString = `${year}-${month < 10 ? `0${month}` : month}-${n < 10 ? `0${n}` : n}`;
        const milestones = getMilestoneInfo(dateString);

        if (milestones && milestones.length > 0) {
          cell.classList.add('has-milestone');

          // Create tooltip with milestone info
          const tooltip = document.createElement('div');
          tooltip.classList.add('milestone-tooltip');
          
          milestones.forEach(milestone => {
            const milestoneInfo = document.createElement('div');
            milestoneInfo.innerHTML = `<strong>Chrome ${milestone.mstone}</strong> ${milestone.channel}`;
            tooltip.appendChild(milestoneInfo);
          });
          
          cell.appendChild(tooltip);

          // Add icons for each milestone
          milestones.forEach(milestone => {
            const icon = document.createElement('i');
            icon.classList.add('fab');
            icon.classList.add('fa-chrome');
            
            // Different colors for different channels
            if (milestone.channel === 'stable') {
              icon.style.backgroundColor = '#4285F4'; // Google Blue
            } else if (milestone.channel === 'beta') {
              icon.style.backgroundColor = '#0F9D58'; // Google Green
            }
            
            info.appendChild(icon);
          });
        }
      }

      row.appendChild(cell);
    }
  }

  return container;
}

async function main() {
  try {
    const response = await fetch('/chromium/data.json');
    if (!response.ok) {
      throw new Error(`Failed to fetch Chromium data: ${response.statusText}`);
    }
    
    const milestoneData = await response.json();
    
    const calendarSection = document.querySelector('.chromium-calendar');
    // Clear out the loading...
    calendarSection.innerHTML = '';

    const now = new Date();
    
    // Show 6 months in the past and 6 months in the future
    for (let monthOffset = 6; monthOffset >= -6; monthOffset--) {
      let year = now.getFullYear();
      let month = now.getMonth() + 1 + monthOffset;
      
      while (month > 12) {
        month -= 12;
        year++;
      }
      
      while (month < 1) {
        month += 12;
        year--;
      }
      
      calendarSection.appendChild(
        generateMonth(year, month, (dateString) => {
          return milestoneData[dateString] || [];
        })
      );
    }
  } catch (error) {
    console.error('Error loading Chromium milestone data:', error);
    document.querySelector('.chromium-calendar').innerHTML = 
      `<div class="error-message">Failed to load Chromium milestone data: ${error.message}</div>`;
  }
}

// Initialize when the DOM is ready
document.addEventListener('DOMContentLoaded', main);