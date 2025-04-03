const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

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
        const dateString = `${year}-${month}-${n}`;
        const releases = getMilestoneInfo(dateString);
        
        if (releases.length > 0) {
          cell.classList.add('has-milestone');
          
          const tooltip = document.createElement('div');
          tooltip.classList.add('milestone-tooltip');
          
          const releaseInfo = releases.map(release => 
            `${release.channel}: ${release.version} (M${release.milestone})`
          ).join('<br>');
          
          tooltip.innerHTML = releaseInfo;
          cell.appendChild(tooltip);
          
          releases.forEach(release => {
            const indicator = document.createElement('i');
            indicator.classList.add('fab', 'fa-chrome');
            
            switch(release.channel.toLowerCase()) {
              case 'stable':
                indicator.style.backgroundColor = '#4285F4';
                break;
              case 'beta':
                indicator.style.backgroundColor = '#0F9D58';
                break;
              case 'dev':
                indicator.style.backgroundColor = '#EA4335';
                break;
              case 'canary':
                indicator.style.backgroundColor = '#FBBC04';
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

async function main() {
  try {
    const response = await fetch('https://chromiumdash.appspot.com/fetch_releases');
    if (!response.ok) {
      throw new Error(`Failed to fetch Chromium releases: ${response.statusText}`);
    }
    
    const releases = await response.json();
    
    const calendarSection = document.querySelector('.chromium-calendar');
    calendarSection.innerHTML = '';

    const now = new Date();
    
    const releasesMap = {};
    releases.forEach(release => {
      const date = new Date(release.time);
      const dateString = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
      
      if (!releasesMap[dateString]) {
        releasesMap[dateString] = [];
      }
      
      releasesMap[dateString].push({
        channel: release.channel,
        version: release.version,
        milestone: release.milestone
      });
    });
    
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
          return releasesMap[dateString] || [];
        })
      );
    }
  } catch (error) {
    console.error('Error loading Chromium releases data:', error);
    document.querySelector('.chromium-calendar').innerHTML = 
      `<div class="error-message">Failed to load Chromium releases data: ${error.message}</div>`;
  }
}

document.addEventListener('DOMContentLoaded', main);