/**
 * Nestlé Brand Map - Interactive Brand Ecosystem Visualization
 * 
 * This script handles the loading, filtering, and display of Nestlé brand data,
 * with both list and radial view options, including advanced D3.js interactivity.
 */

// Global variables
let allBrands = [];
let currentView = 'radial';  // Start with 'radial' view as default
let radialSvg = null;        // D3 SVG reference
let radialZoom = null;       // D3 zoom behavior
let tooltip = null;          // Tooltip element
let rotation = 0;            // Current rotation angle for the radial view

// Initialize the application when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
    // Create tooltip element
    createTooltip();
    
    // Set up event listeners
    setupEventListeners();
    
    // Set the initial theme
    setTheme(document.documentElement.getAttribute('data-theme') || 'dark');
    
    // Simulate loading with a timeout
    setTimeout(() => {
        hideLoadingScreen();
        // Load brand data
        loadBrandData();
    }, 1500);

    // Help modal setup
    const helpBtn = document.createElement('button');
    helpBtn.id = 'help-btn';
    helpBtn.innerHTML = '<i class="fas fa-question-circle"></i>';
    helpBtn.title = 'Help / Guide';
    helpBtn.setAttribute('aria-label', 'Show help and guide');
    helpBtn.style.marginLeft = '8px';
    document.querySelector('.theme-toggle').appendChild(helpBtn);
    const helpModal = document.createElement('div');
    helpModal.id = 'help-modal';
    helpModal.className = 'modal';
    helpModal.innerHTML = `
        <div class="modal-content">
            <span class="close-button">&times;</span>
            <h2>How to Use the Brand Map</h2>
            <ul style="text-align:left;line-height:1.7;">
                <li><b>Switch Views:</b> Use the buttons above the map to toggle between Radial, Sunburst, and List views.</li>
                <li><b>Zoom & Rotate:</b> Use the controls below the map, or pinch/rotate on touch devices.</li>
                <li><b>Search & Filter:</b> Use the search box and region filter to find brands.</li>
                <li><b>Tooltips:</b> Hover or tap a brand node to see details. Click to pin/unpin.</li>
                <li><b>Legend:</b> Hover a node to highlight its category in the legend.</li>
                <li><b>High Contrast:</b> Use the eye icon in the header for accessibility.</li>
                <li><b>Export:</b> Use the export button to save the map as an image.</li>
            </ul>
        </div>
    `;
    document.body.appendChild(helpModal);
    helpBtn.addEventListener('click', () => {
        helpModal.classList.add('show');
    });
    helpModal.querySelector('.close-button').addEventListener('click', () => {
        helpModal.classList.remove('show');
    });
    window.addEventListener('click', (event) => {
        if (event.target === helpModal) {
            helpModal.classList.remove('show');
        }
    });

    // On load, remove data-contrast from <html> if present
    if (document.documentElement.hasAttribute('data-contrast')) {
        document.documentElement.removeAttribute('data-contrast');
    }
});

/**
 * Create tooltip element for interactive hover effects
 */
function createTooltip() {
    tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    tooltip.setAttribute('role', 'tooltip');
    document.body.appendChild(tooltip);
}

/**
 * Set up event listeners for interactive elements
 */
function setupEventListeners() {
    // Theme toggle
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    themeToggleBtn.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        setTheme(currentTheme === 'dark' ? 'light' : 'dark');
    });
    
    // Search functionality
    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('input', () => {
        filterBrands();
    });
    
    // Region filter
    const regionFilter = document.getElementById('region-filter');
    regionFilter.addEventListener('change', () => {
        filterBrands();
    });
    
    // View toggle buttons
    const listViewBtn = document.getElementById('list-view-btn');
    const radialViewBtn = document.getElementById('radial-view-btn');
    const sunburstViewBtn = document.getElementById('sunburst-view-btn');
    
    listViewBtn.addEventListener('click', () => {
        if (currentView !== 'list') {
            switchView('list');
        }
    });
    
    radialViewBtn.addEventListener('click', () => {
        if (currentView !== 'radial') {
            switchView('radial');
        }
    });
    
    sunburstViewBtn.addEventListener('click', () => {
        if (currentView !== 'sunburst') {
            switchView('sunburst');
        }
    });
    
    // Close modal when clicking the X button
    const closeButton = document.querySelector('.close-button');
    closeButton.addEventListener('click', () => {
        document.getElementById('brand-modal').classList.remove('show');
    });
    
    // Close modal when clicking outside the modal content
    window.addEventListener('click', (event) => {
        const modal = document.getElementById('brand-modal');
        if (event.target === modal) {
            modal.classList.remove('show');
        }
    });
    
    // Radial view zoom and rotation controls
    document.getElementById('zoom-in').addEventListener('click', () => {
        if (radialZoom) {
            radialSvg.transition().duration(400).ease(d3.easeCubicOut).call(radialZoom.scaleBy, 1.5);
        }
    });
    
    document.getElementById('zoom-out').addEventListener('click', () => {
        if (radialZoom) {
            radialSvg.transition().duration(400).ease(d3.easeCubicOut).call(radialZoom.scaleBy, 0.75);
        }
    });
    
    document.getElementById('reset-zoom').addEventListener('click', () => {
        if (radialZoom) {
            rotation = 0; // Reset rotation
            radialSvg.transition().duration(600).ease(d3.easeCubicOut)
                .call(radialZoom.transform, d3.zoomIdentity);
            
            // Reset any rotations
            updateRadialRotation(0);
        }
    });
    
    // Rotation controls
    document.getElementById('rotate-left').addEventListener('click', () => {
        rotation -= 30;
        if (radialSvg) {
            radialSvg.select('g').transition().duration(400).ease(d3.easeCubicOut)
                .attr('transform', () => {
                    const diagramContainer = document.getElementById('radial-diagram');
                    const svg = diagramContainer.querySelector('#radial-svg-wrap svg');
                    const width = svg ? svg.clientWidth : 600;
                    const height = svg ? svg.clientHeight : 600;
                    return `translate(${width / 2},${height / 2}) rotate(${rotation})`;
                });
        }
    });
    
    document.getElementById('rotate-right').addEventListener('click', () => {
        rotation += 30;
        if (radialSvg) {
            radialSvg.select('g').transition().duration(400).ease(d3.easeCubicOut)
                .attr('transform', () => {
                    const diagramContainer = document.getElementById('radial-diagram');
                    const svg = diagramContainer.querySelector('#radial-svg-wrap svg');
                    const width = svg ? svg.clientWidth : 600;
                    const height = svg ? svg.clientHeight : 600;
                    return `translate(${width / 2},${height / 2}) rotate(${rotation})`;
                });
        }
    });
    
    // Handle window resize
    window.addEventListener('resize', debounce(() => {
        if (currentView === 'radial' && radialSvg) {
            initializeRadialView();
        }
    }, 250));
}

/**
 * Set theme (dark or light)
 * @param {string} theme - 'dark' or 'light'
 */
function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
}

/**
 * Switch between list and radial views
 * @param {string} view - The view to switch to ('list' or 'radial' or 'sunburst')
 */
function switchView(view) {
    const listView = document.getElementById('list-view');
    const radialView = document.getElementById('radial-view');
    const sunburstView = document.getElementById('sunburst-view');
    const listViewBtn = document.getElementById('list-view-btn');
    const radialViewBtn = document.getElementById('radial-view-btn');
    const sunburstViewBtn = document.getElementById('sunburst-view-btn');
    
    currentView = view;
    
    if (view === 'list') {
        listView.classList.remove('hidden');
        radialView.classList.add('hidden');
        sunburstView.classList.add('hidden');
        listViewBtn.classList.add('active');
        radialViewBtn.classList.remove('active');
        sunburstViewBtn.classList.remove('active');
    } else if (view === 'radial') {
        listView.classList.add('hidden');
        radialView.classList.remove('hidden');
        sunburstView.classList.add('hidden');
        listViewBtn.classList.remove('active');
        radialViewBtn.classList.add('active');
        sunburstViewBtn.classList.remove('active');
        // Initialize or update radial diagram
        initializeRadialView();
    } else if (view === 'sunburst') {
        listView.classList.add('hidden');
        radialView.classList.add('hidden');
        sunburstView.classList.remove('hidden');
        listViewBtn.classList.remove('active');
        radialViewBtn.classList.remove('active');
        sunburstViewBtn.classList.add('active');
        // Initialize or update sunburst diagram
        initializeSunburstView();
    }
    // Apply filters in the new view
    filterBrands();
}

/**
 * Hide loading screen and show main content
 */
function hideLoadingScreen() {
    document.getElementById('loading-screen').style.opacity = '0';
    setTimeout(() => {
        document.getElementById('loading-screen').style.display = 'none';
        document.getElementById('main-content').classList.remove('hidden');
        // Ensure radial view is initialized after layout is updated
        if (currentView === 'radial') {
            requestAnimationFrame(() => {
                initializeRadialView();
            });
        }
    }, 500);
}

/**
 * Load brand data from JSON file
 */
function loadBrandData() {
    fetch('brands.json')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            // Store brands globally
            allBrands = data;
            
            // Initialize views
            if (currentView === 'radial') {
                initializeRadialView();
                renderCategories(data); // Still render list view in background
            } else if (currentView === 'sunburst') {
                initializeSunburstView();
                renderCategories(data);
            } else {
                renderCategories(data);
            }
        })
        .catch(error => {
            console.error('Error loading brand data:', error);
            document.getElementById('radial-diagram').innerHTML = `
                <div class="no-results">
                    <h2>Error Loading Data</h2>
                    <p>${error.message}</p>
                    <button onclick="location.reload()">Try Again</button>
                </div>
            `;
        });
}

/**
 * Filter brands based on search input and region selection
 */
function filterBrands() {
    // Get filter values
    const searchValue = document.getElementById('search-input').value.toLowerCase();
    const regionValue = document.getElementById('region-filter').value;
    
    // Filter the brands
    const filteredBrands = allBrands.filter(brand => {
        // Search filter
        const matchesSearch = searchValue === '' || 
            brand.name.toLowerCase().includes(searchValue) ||
            brand.description.toLowerCase().includes(searchValue) ||
            brand.tagline.toLowerCase().includes(searchValue);
        
        // Region filter
        const matchesRegion = regionValue === 'all' || brand.region === regionValue;
        
        return matchesSearch && matchesRegion;
    });
    
    // Update the current view based on filters
    if (currentView === 'list') {
        updateListView(filteredBrands);
    } else if (currentView === 'radial') {
        updateRadialView(filteredBrands);
    } else if (currentView === 'sunburst') {
        initializeSunburstView();
    }
}

/**
 * Update the list view with filtered brands
 * @param {Array} filteredBrands - The filtered array of brand objects
 */
function updateListView(filteredBrands) {
    // Show no results message if needed
    if (filteredBrands.length === 0) {
        document.getElementById('category-view').innerHTML = `
            <div class="no-results">
                <h2>No brands found</h2>
                <p>Try adjusting your search criteria.</p>
            </div>
        `;
    } else {
        // Render the filtered brands
        renderCategories(filteredBrands);
    }
}

/**
 * Render brands grouped by categories (list view)
 * @param {Array} brands - The array of brand objects
 */
function renderCategories(brands) {
    // Group brands by category
    const categories = {};
    brands.forEach(brand => {
        if (!categories[brand.category]) {
            categories[brand.category] = [];
        }
        categories[brand.category].push(brand);
    });
    
    // Clear the container
    const container = document.getElementById('category-view');
    container.innerHTML = '';
    
    // Create a section for each category
    for (const category in categories) {
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'category';
        
        // Add category header
        categoryDiv.innerHTML = `
            <h2>${category} <small>(${categories[category].length})</small></h2>
            <div class="category-brands"></div>
        `;
        
        // Add brand cards to this category
        const brandsContainer = categoryDiv.querySelector('.category-brands');
        categories[category].forEach(brand => {
            const brandCard = createBrandCard(brand);
            brandsContainer.appendChild(brandCard);
        });
        
        container.appendChild(categoryDiv);
    }
}

/**
 * Create a brand card element
 * @param {Object} brand - The brand object
 * @returns {HTMLElement} - The brand card element
 */
function createBrandCard(brand) {
    const card = document.createElement('div');
    card.className = 'brand-card';
    
    // Create card content
    card.innerHTML = `
        <div class="brand-info">
            <div class="brand-logo">
                <img src="${brand.logo_url}" alt="${brand.name} logo" onerror="this.onerror=null;this.classList.add('svg-placeholder');this.src='data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'32\' height=\'32\'><rect width=\'32\' height=\'32\' fill=\'%23eee\'/><text x=\'16\' y=\'20\' font-size=\'14\' text-anchor=\'middle\' fill=\'%23999\'>?</text></svg>'">
            </div>
            <div class="brand-details">
                <h3>${brand.name}</h3>
                <p class="brand-tagline">${brand.tagline}</p>
            </div>
        </div>
        <p class="brand-description">${brand.description}</p>
        <div class="brand-tags">
            <span class="tag">${brand.category}</span>
            <span class="tag">${brand.region}</span>
        </div>
    `;
    
    // Add click event to show details
    card.addEventListener('click', () => {
        showBrandDetails(brand);
    });
    
    return card;
}

/**
 * Show detailed brand information in modal
 * @param {Object} brand - The brand object
 */
function showBrandDetails(brand) {
    const detailContent = document.getElementById('brand-detail-content');
    
    // Create modal content
    detailContent.innerHTML = `
        <div class="modal-logo">
            <img src="${brand.logo_url}" alt="${brand.name} logo" onerror="this.onerror=null;this.classList.add('svg-placeholder');this.src='data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'32\' height=\'32\'><rect width=\'32\' height=\'32\' fill=\'%23eee\'/><text x=\'16\' y=\'20\' font-size=\'14\' text-anchor=\'middle\' fill=\'%23999\'>?</text></svg>'">
        </div>
        <h2 class="modal-brand-name">${brand.name}</h2>
        <p class="modal-brand-tagline">"${brand.tagline}"</p>
        
        <div class="modal-section">
            <h3>About</h3>
            <p>${brand.description}</p>
        </div>
        
        <div class="modal-section">
            <h3>Details</h3>
            <p><strong>Category:</strong> ${brand.category}</p>
            <p><strong>Region:</strong> ${brand.region}</p>
        </div>
        
        <div class="brand-tags">
            <span class="tag">${brand.category}</span>
            <span class="tag">${brand.region}</span>
        </div>
    `;
    
    // Show the modal with animation
    const modal = document.getElementById('brand-modal');
    modal.classList.add('show');
}

/**
 * Initialize the radial view diagram using D3.js
 */
function initializeRadialView() {
    // Clear the previous diagram
    const diagramContainer = document.getElementById('radial-diagram');
    diagramContainer.innerHTML = '';
    d3.select('#radial-legend').remove();
    let flexWrap = d3.select('#radial-diagram').select('#radial-flex-wrap');
    if (!flexWrap.node()) {
        flexWrap = d3.select('#radial-diagram')
            .append('div')
            .attr('id', 'radial-flex-wrap')
            .style('display', 'flex')
            .style('flex-direction', 'row')
            .style('align-items', 'center')
            .style('justify-content', 'center');
    } else {
        flexWrap.html('');
    }
    flexWrap.append('div')
        .attr('id', 'radial-legend')
        .style('display', 'flex')
        .style('flex-direction', 'column')
        .style('align-items', 'flex-end')
        .style('gap', '18px')
        .style('margin-right', '24px')
        .style('min-width', '120px');
    const svgWrap = flexWrap.append('div').attr('id', 'radial-svg-wrap');
    // Responsive width/height
    svgWrap.style('width', '100%').style('height', '100%');
    // Use the full width and height of the container
    const wrapRect = diagramContainer.getBoundingClientRect();
    const width = Math.max(400, wrapRect.width || 600);
    const height = Math.max(400, wrapRect.height || 600);
    // Use the smallest dimension for radius, but allow the SVG to be rectangular
    const radius = Math.min(width, height) / 2 - 40;
    radialSvg = d3.select(svgWrap.node())
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .attr('viewBox', `0 0 ${width} ${height}`)
        .attr('preserveAspectRatio', 'xMidYMid meet');
    const g = radialSvg.append('g')
        .attr('transform', `translate(${width / 2},${height / 2})`)
        .attr('opacity', 1);
    radialZoom = d3.zoom()
        .scaleExtent([0.3, 5])
        .on('zoom', (event) => {
            g.attr('transform', `translate(${width / 2},${height / 2}) scale(${event.transform.k}) rotate(${rotation})`);
        });
    radialSvg.call(radialZoom);
    updateRadialRotation(rotation, g, width, height);
    const radialData = prepareRadialData();
    const cluster = d3.cluster().size([360, radius]);
    const root = d3.hierarchy(radialData);
    cluster(root);
    const linksGroup = g.append('g').attr('class', 'links');
    linksGroup.selectAll('.link')
        .data(root.links())
        .enter()
        .append('path')
        .attr('class', 'link')
        .attr('d', d => {
            return `M${project(d.target.x, d.target.y)}
                    C${project(d.target.x, (d.source.y + d.target.y) / 2)}
                     ${project(d.source.x, (d.source.y + d.target.y) / 2)}
                     ${project(d.source.x, d.source.y)}`;
        })
        .attr('opacity', 0)
        .transition().duration(600)
        .attr('opacity', 1);
    const nodesGroup = g.append('g').attr('class', 'nodes');
    const nodes = nodesGroup.selectAll('.node')
        .data(root.descendants())
        .enter()
        .append('g')
        .attr('class', d => {
            let classes = 'node';
            if (d.depth === 0) classes += ' root-node';
            else if (d.children) classes += ' parent-node';
            else classes += ' brand-node';
            if (d.data.category) {
                classes += ' ' + d.data.category.toLowerCase().replace(/\s+/g, '-');
            }
            return classes;
        })
        .attr('transform', d => `translate(${project(d.x, d.y)})`)
        .attr('opacity', 0);
    nodes.transition().duration(600).attr('opacity', 1);
    nodes.append('circle')
        .attr('r', d => d.depth === 0 ? 30 : d.children ? 20 : 15)
        // For leaf nodes, use the logo as a fill pattern
        .each(function(d) {
            if (!d.children && d.data.logo_url) {
                const node = d3.select(this);
                const id = `logo-pattern-${d.data.name.replace(/[^a-zA-Z0-9]/g, '')}`;
                // Only add pattern once
                if (!radialSvg.select(`#${id}`).node()) {
                    const defs = radialSvg.select('defs').empty() ? radialSvg.insert('defs', ':first-child') : radialSvg.select('defs');
                    defs.append('pattern')
                        .attr('id', id)
                        .attr('patternUnits', 'objectBoundingBox')
                        .attr('width', 1)
                        .attr('height', 1)
                        .append('image')
                        .attr('href', d.data.logo_url)
                        .attr('width', 30)
                        .attr('height', 30)
                        .attr('x', 0)
                        .attr('y', 0);
                }
                node.attr('fill', `url(#${id})`);
            }
        });
    nodes.append('text')
        .attr('dy', '.31em')
        .attr('x', d => {
            if (d.depth === 0 || d.children) return 0;
            // Only leaf nodes (brands) offset outward
            // Flip x for left half
            return (d.x > 90 && d.x < 270) ? -1 * (d.y >= radius * 0.95 ? 22 : 15) : (d.y >= radius * 0.95 ? 22 : 15);
        })
        .attr('text-anchor', d => {
            if (d.depth === 0 || d.children) return 'middle';
            // Flip anchor for left half
            return (d.x > 90 && d.x < 270) ? 'end' : 'start';
        })
        .attr('transform', d => {
            if (d.depth === 0 || d.children) return null;
            // No rotation, keep text upright
            return null;
        })
        .text(d => d.data.name)
        .style('font-size', d => d.depth === 0 ? '16px' : d.children ? '14px' : '12px')
        .style('font-weight', d => d.depth <= 1 ? 'bold' : 'normal');
    // Ensure legend is visible after SVG rendering
    addRadialLegend();
    nodes.on('mouseenter', (event, d) => {
            if (d.depth === 0) return;
            if (tooltip.classList.contains('pinned')) return;
            // Highlight legend
            if (d.data.category) {
                const legendItems = document.querySelectorAll(`#radial-legend div`);
                legendItems.forEach(item => {
                    if (item.textContent.trim().startsWith(d.data.category)) {
                        item.style.background = 'rgba(0,115,178,0.12)';
                        item.style.fontWeight = 'bold';
                    }
                });
            }
            tooltip.innerHTML = `
                <div style="display:flex;align-items:center;gap:10px;">
                    <img src="${d.data.logo_url}" alt="${d.data.name} logo" style="width:32px;height:32px;border-radius:50%;background:#eee;object-fit:cover;" onerror="this.onerror=null;this.classList.add('svg-placeholder');this.src='data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'32\' height=\'32\'><rect width=\'32\' height=\'32\' fill=\'%23eee\'/><text x=\'16\' y=\'20\' font-size=\'14\' text-anchor=\'middle\' fill=\'%23999\'>?</text></svg>'">
                    <strong>${d.data.name}</strong>
                </div>
                ${d.data.tagline ? `<br><em>${d.data.tagline}</em>` : ''}
                ${d.data.region ? `<br><span style='color:#888;'>${d.data.region}</span>` : ''}
                ${d.data.website ? `<br><a href='${d.data.website}' target='_blank'>Website</a>` : ''}
            `;
            tooltip.style.left = (event.pageX + 10) + 'px';
            tooltip.style.top = (event.pageY + 10) + 'px';
            tooltip.classList.add('visible');
            d3.select(event.currentTarget)
                .select('circle')
                .transition()
                .duration(200)
                .attr('r', d.depth === 0 ? 32 : d.children ? 22 : 18)
                .style('filter', 'drop-shadow(0 0 8px #0073B2)');
        })
        .on('mousemove', (event) => {
            if (tooltip.classList.contains('pinned')) return;
            tooltip.style.left = (event.pageX + 10) + 'px';
            tooltip.style.top = (event.pageY + 10) + 'px';
        })
        .on('mouseleave', (event, d) => {
            if (tooltip.classList.contains('pinned')) return;
            // Remove legend highlight
            const legendItems = document.querySelectorAll(`#radial-legend div`);
            legendItems.forEach(item => {
                item.style.background = '';
                item.style.fontWeight = '';
            });
            tooltip.classList.remove('visible');
            d3.select(event.currentTarget)
                .select('circle')
                .transition()
                .duration(200)
                .attr('r', d.depth === 0 ? 30 : d.children ? 20 : 15)
                .style('filter', null);
        });
    // Pin tooltip on click/tap
    nodes.filter(d => !d.children && d.depth > 0)
        .on('click', (event, d) => {
            event.stopPropagation();
            tooltip.innerHTML = `
                <div style="display:flex;align-items:center;gap:10px;">
                    <img src="${d.data.logo_url}" alt="${d.data.name} logo" style="width:32px;height:32px;border-radius:50%;background:#eee;object-fit:cover;" onerror="this.onerror=null;this.classList.add('svg-placeholder');this.src='data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'32\' height=\'32\'><rect width=\'32\' height=\'32\' fill=\'%23eee\'/><text x=\'16\' y=\'20\' font-size=\'14\' text-anchor=\'middle\' fill=\'%23999\'>?</text></svg>'">
                    <strong>${d.data.name}</strong>
                </div>
                ${d.data.tagline ? `<br><em>${d.data.tagline}</em>` : ''}
                ${d.data.region ? `<br><span style='color:#888;'>${d.data.region}</span>` : ''}
                ${d.data.website ? `<br><a href='${d.data.website}' target='_blank'>Website</a>` : ''}
            `;
            tooltip.classList.add('visible', 'pinned');
            tooltip.style.left = (event.pageX + 10) + 'px';
            tooltip.style.top = (event.pageY + 10) + 'px';
        });
    // Unpin tooltip on background click
    document.body.addEventListener('click', (e) => {
        if (!tooltip.contains(e.target)) {
            tooltip.classList.remove('pinned');
            tooltip.classList.remove('visible');
        }
    });
    updateRadialView(allBrands.filter(brand => {
        const regionValue = document.getElementById('region-filter').value;
        const searchValue = document.getElementById('search-input').value.toLowerCase();
        const matchesRegion = regionValue === 'all' || brand.region === regionValue;
        const matchesSearch = searchValue === '' || 
            brand.name.toLowerCase().includes(searchValue) ||
            brand.description.toLowerCase().includes(searchValue) ||
            brand.tagline.toLowerCase().includes(searchValue);
        return matchesRegion && matchesSearch;
    }));
    function project(x, y) {
        const angle = (x - 90) / 180 * Math.PI;
        return [y * Math.cos(angle), y * Math.sin(angle)];
    }
    // Add touch support for zoom and rotate
    let lastTouchDist = null;
    let lastTouchAngle = null;
    let lastRotation = rotation;
    const svgNode = radialSvg.node();
    svgNode.addEventListener('touchstart', function(e) {
        if (e.touches.length === 2) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            lastTouchDist = Math.sqrt(dx * dx + dy * dy);
            lastTouchAngle = Math.atan2(dy, dx) * 180 / Math.PI;
            lastRotation = rotation;
        }
    }, { passive: false });
    svgNode.addEventListener('touchmove', function(e) {
        if (e.touches.length === 2) {
            e.preventDefault();
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx) * 180 / Math.PI;
            // Pinch zoom
            const scale = dist / lastTouchDist;
            if (radialZoom) {
                radialSvg.call(radialZoom.scaleBy, scale);
            }
            // Rotate
            const deltaAngle = angle - lastTouchAngle;
            rotation = lastRotation + deltaAngle;
            updateRadialRotation(rotation);
        }
    }, { passive: false });
    svgNode.addEventListener('touchend', function(e) {
        lastTouchDist = null;
        lastTouchAngle = null;
        lastRotation = rotation;
    });
}

/**
 * Update the radial view rotation
 * @param {number} angle - Rotation angle in degrees
 */
function updateRadialRotation(angle, gOverride, wOverride, hOverride) {
    const diagramContainer = document.getElementById('radial-diagram');
    const width = wOverride || (diagramContainer.querySelector('#radial-svg-wrap svg') ? diagramContainer.querySelector('#radial-svg-wrap svg').clientWidth : 600);
    const height = hOverride || (diagramContainer.querySelector('#radial-svg-wrap svg') ? diagramContainer.querySelector('#radial-svg-wrap svg').clientHeight : 600);
    const g = gOverride || (radialSvg ? radialSvg.select('g') : null);
    if (!g) return;
    g.transition().duration(500)
        .attr('transform', `translate(${width / 2},${height / 2}) rotate(${angle})`)
        .attr('opacity', 1);
}

/**
 * Update the radial view with filtered brands
 * @param {Array} filteredBrands - The filtered array of brand objects
 */
function updateRadialView(filteredBrands) {
    if (!radialSvg) return;
    const filteredBrandNames = filteredBrands.map(b => b.name);
    // Update node visibility based on filter
    radialSvg.selectAll('.brand-node')
        .classed('filtered', d => {
            // Check if this brand is in the filtered list
            return !filteredBrandNames.includes(d.data.name);
        })
        .classed('highlight', d => {
            // Highlight if this brand matches the search
            const searchValue = document.getElementById('search-input').value.toLowerCase();
            return searchValue && (
                d.data.name.toLowerCase().includes(searchValue) ||
                (d.data.description && d.data.description.toLowerCase().includes(searchValue)) ||
                (d.data.tagline && d.data.tagline.toLowerCase().includes(searchValue))
            );
        });
    // If no brands match, show a message
    const noResultsMsg = document.querySelector('#radial-view .no-results');
    
    if (filteredBrands.length === 0) {
        if (!noResultsMsg) {
            const msg = document.createElement('div');
            msg.className = 'no-results';
            msg.innerHTML = `
                <h2>No brands found</h2>
                <p>Try adjusting your search criteria.</p>
            `;
            document.getElementById('radial-view').appendChild(msg);
        }
        
        // Fade the diagram
        radialSvg.style('opacity', 0.2);
    } else {
        // Remove any "no results" message
        if (noResultsMsg) {
            noResultsMsg.remove();
        }
        
        // Show the diagram
        radialSvg.style('opacity', 1);
    }
}

/**
 * Prepare data for radial visualization
 * @returns {Object} - Hierarchical data structure for D3
 */
function prepareRadialData() {
    // Create the root node (Nestlé)
    const rootNode = {
        name: "Nestlé",
        children: []
    };
    
    // Group brands by category
    const categories = {};
    allBrands.forEach(brand => {
        if (!categories[brand.category]) {
            categories[brand.category] = [];
        }
        categories[brand.category].push(brand);
    });
    
    // Create category nodes
    for (const category in categories) {
        const categoryNode = {
            name: category,
            category: category, // Add category info to the node
            children: categories[category]
        };
        rootNode.children.push(categoryNode);
    }
    
    return rootNode;
}

/**
 * Initialize the sunburst view diagram using D3.js
 */
function initializeSunburstView() {
    // Clear the previous diagram
    const diagramContainer = document.getElementById('sunburst-diagram');
    diagramContainer.innerHTML = '';
    
    // Define dimensions
    const width = diagramContainer.clientWidth || 600;
    const height = width;
    const radius = Math.min(width, height) / 2;
    
    // Create the SVG container
    const svg = d3.select('#sunburst-diagram')
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .append('g')
        .attr('transform', `translate(${width / 2},${height / 2})`);
    
    // Prepare data
    const sunburstData = prepareRadialData();
    const partition = d3.partition().size([2 * Math.PI, radius]);
    const root = d3.hierarchy(sunburstData)
        .sum(d => d.children ? 0 : 1)
        .sort((a, b) => b.value - a.value);
    partition(root);
    
    const color = d3.scaleOrdinal(d3.schemeCategory10);
    const arc = d3.arc()
        .startAngle(d => d.x0)
        .endAngle(d => d.x1)
        .innerRadius(d => d.y0)
        .outerRadius(d => d.y1 - 2);
    
    // Tooltip
    let sbTooltip = d3.select('body').append('div')
        .attr('class', 'd3-tooltip')
        .style('opacity', 0);
    
    svg.selectAll('path')
        .data(root.descendants().filter(d => d.depth))
        .enter().append('path')
        .attr('display', d => d.depth ? null : 'none')
        .attr('d', arc)
        .attr('fill', d => {
            if (d.depth === 1) return color(d.data.name);
            if (d.depth === 2) return color(d.parent.data.name);
            return '#eee';
        })
        .attr('stroke', '#fff')
        .on('mouseover', function(event, d) {
            d3.select(this).attr('opacity', 0.7);
            sbTooltip.transition().duration(200).style('opacity', 1);
            let html = '';
            if (d.depth === 1) {
                html = `<strong>Category:</strong> ${d.data.name}`;
            } else if (d.depth === 2) {
                html = `<strong>${d.data.name}</strong><br>` +
                    `<em>${d.data.tagline || ''}</em><br>` +
                    `<small>${d.data.description || ''}</small><br>` +
                    `<strong>Region:</strong> ${d.data.region || ''}<br>` +
                    `<img src='${d.data.logo_url}' alt='${d.data.name} logo' style='width:32px;height:32px;margin-top:4px;'>`;
            }
            sbTooltip.html(html)
                .style('left', (event.pageX + 20) + 'px')
                .style('top', (event.pageY - 20) + 'px');
        })
        .on('mousemove', function(event) {
            sbTooltip.style('left', (event.pageX + 20) + 'px')
                   .style('top', (event.pageY - 20) + 'px');
        })
        .on('mouseout', function() {
            d3.select(this).attr('opacity', 1);
            sbTooltip.transition().duration(200).style('opacity', 0);
        })
        .on('click', function(event, d) {
            if (d.depth === 2) {
                showBrandDetails(d.data);
            }
        });
    
    // Add category labels
    svg.selectAll('text')
        .data(root.descendants().filter(d => d.depth === 1))
        .enter().append('text')
        .attr('transform', function(d) {
            const angle = ((d.x0 + d.x1) / 2) * 180 / Math.PI - 90;
            return `rotate(${angle}) translate(${(d.y0 + d.y1) / 2},0) rotate(${angle > 90 ? 180 : 0})`;
        })
        .attr('dx', '-20')
        .attr('dy', '.35em')
        .text(d => d.data.name)
        .style('font-size', '14px')
        .style('fill', '#333');
}

/**
 * Debounce function to limit how often a function can be called
 * @param {Function} func - The function to debounce
 * @param {number} wait - The debounce wait time in milliseconds
 * @returns {Function} - Debounced function
 */
function debounce(func, wait) {
    let timeout;
    return function() {
        const context = this;
        const args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            func.apply(context, args);
        }, wait);
    };
}

// Add this function at the end of the file
function addRadialLegend() {
    // Remove any existing legend
    d3.select('#radial-legend').remove();
    // Get unique categories and their colors
    const categories = Array.from(new Set(allBrands.map(b => b.category)));
    const colorMap = {
        'Coffee': '#8D6E63',
        'Sweets': '#EC407A',
        'Pet Care': '#66BB6A',
        'Water': '#29B6F6',
        'Beverages': '#FFA726'
    };
    // Create legend container (vertical)
    const legend = d3.select('#radial-flex-wrap').select('#radial-legend');
    categories.forEach(cat => {
        legend.append('div')
            .style('display', 'flex')
            .style('align-items', 'center')
            .style('gap', '6px')
            .style('margin-bottom', '8px')
            .html(`<span style="display:inline-block;width:16px;height:16px;border-radius:50%;background:${colorMap[cat] || '#ccc'};border:1.5px solid #888;"></span><span style="font-size:14px;">${cat}</span>`);
    });
}