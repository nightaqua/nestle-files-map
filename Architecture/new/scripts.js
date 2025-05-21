/**
 * Nestlé Brand Map - Interactive Brand Ecosystem Visualization
 *
 * This script handles the loading, filtering, and display of Nestlé brand data,
 * with both list and radial view options, including advanced D3.js interactivity.
 * Radial view now uses icons/logos within nodes instead of text labels and
 * represents the L'Oréal hierarchy.
 */

// Global variables
let allBrands = [];
let currentView = 'radial'; // Start with 'radial' view as default
let radialSvg = null; // D3 SVG reference
let radialZoom = null; // D3 zoom behavior
let tooltip = null; // Tooltip element
let rotation = 0; // Current rotation angle for the radial view
let lastGestureRotation = 0; // For touch rotation gestures

// Define radii for different node types - accessible globally or passed around
// Made globally accessible for use in updateRadialRotation and event handlers
const radii = {
    root: 35,
    loreal_parent: 28,
    category_bg: 22, // Background circle for category SVG
    brand: 18
};
const categoryIconSize = 30; // Display size for category SVG icons

// Define colors for categories (should match CSS or be consistent)
// Ensure these match the colors used in styles.css or are generated consistently
const colorMap = {
    'Coffee': '#8D6E63', // Brown
    'Sweets': '#EC407A', // Pink
    'Pet_Care': '#66BB6A', // Green
    'Water': '#29B6F6', // Light Blue
    'Beverages': '#FFA726', // Orange
    'Cereal': '#9C27B0', // Purple
    'Icecream': '#FFCDD2', // Light Pink
    'Cosmetics': '#FF8A65', // Light Orange
    'Fashion': '#BA68C8' // Different purple
    // Add colors for other categories if needed
};

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

    // Help modal setup (kept as is)
    const helpBtn = document.createElement('button');
    helpBtn.id = 'help-btn';
    helpBtn.innerHTML = '<i class="fas fa-question-circle"></i>';
    helpBtn.title = 'Help / Guide';
    helpBtn.setAttribute('aria-label', 'Show help and guide');
    helpBtn.style.marginLeft = '8px';
    const themeToggleDiv = document.querySelector('.theme-toggle');
    if (themeToggleDiv) { // Check if the element exists
      themeToggleDiv.appendChild(helpBtn);
    } else {
      console.error('Theme toggle div not found.');
    }

    const helpModal = document.createElement('div');
    helpModal.id = 'help-modal';
    helpModal.className = 'modal';
    helpModal.innerHTML = `
        <div class="modal-content">
            <span class="close-button">&times;</span>
            <h2>How to Use the Brand Map</h2>
            <ul style="text-align:left;line-height:1.7;">
                <li><b>Switch Views:</b> Use the buttons above the map to toggle between Radial and List views.</li>
                <li><b>Zoom & Rotate:</b> Use the controls below the map, or pinch/rotate on touch devices.</li>
                <li><b>Search & Filter:</b> Use the search box and region filter to find brands.</li>
                <li><b>Tooltips:</b> Hover or tap a node to see details. Click to pin/unpin.</li>
                <li><b>Legend:</b> (Note: Legend functionality may be limited with icon-based nodes)</li>
                 <li><b>Theme Toggle:</b> Use the sun/moon icon in the header.</li>
            </ul>
        </div>
    `;
     document.body.appendChild(helpModal);

    const helpModalCloseButton = helpModal.querySelector('.close-button');
     if (helpModalCloseButton) { // Check if the element exists
        helpModalCloseButton.addEventListener('click', () => {
            const modal = document.getElementById('help-modal'); // Corrected modal id
            if(modal) modal.classList.remove('show');
        });
    }
    window.addEventListener('click', (event) => {
        const helpModalElement = document.getElementById('help-modal'); // Corrected modal id
        if (helpModalElement && event.target === helpModalElement) {
            helpModalElement.classList.remove('show');
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
     // Ensure the tooltip doesn't block clicks on the document body for unpinning
    tooltip.addEventListener('click', (event) => {
        event.stopPropagation(); // Prevent click on tooltip from propagating to body
    });
}

/**
 * Set up event listeners for interactive elements
 */
function setupEventListeners() {
    // Theme toggle
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    if(themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            setTheme(currentTheme === 'dark' ? 'light' : 'dark');
        });
    }


    // Search functionality
    const searchInput = document.getElementById('search-input');
    if(searchInput) {
        searchInput.addEventListener('input', () => {
            filterBrands();
        });
    }

    // Region filter
    const regionFilter = document.getElementById('region-filter');
     if(regionFilter) {
        regionFilter.addEventListener('change', () => {
            filterBrands();
        });
    }


    // View toggle buttons
    const listViewBtn = document.getElementById('list-view-btn');
    const radialViewBtn = document.getElementById('radial-view-btn');

    if(listViewBtn) {
        listViewBtn.addEventListener('click', () => {
            if (currentView !== 'list') {
                switchView('list');
            }
        });
    }

    if(radialViewBtn) {
        radialViewBtn.addEventListener('click', () => {
            if (currentView !== 'radial') {
                switchView('radial');
            }
        });
    }


    // Close modal when clicking the X button
    const closeButton = document.querySelector('#brand-modal .close-button');
     if (closeButton) { // Check if the element exists
        closeButton.addEventListener('click', () => {
            const modal = document.getElementById('brand-modal');
            if(modal) modal.classList.remove('show');
        });
    }


    // Close modal when clicking outside the modal content
    window.addEventListener('click', (event) => {
        const modal = document.getElementById('brand-modal');
        if (modal && event.target === modal) {
            modal.classList.remove('show');
        }
    });


    // Radial view zoom and rotation controls
    const zoomInBtn = document.getElementById('zoom-in');
    const zoomOutBtn = document.getElementById('zoom-out');
    const resetZoomBtn = document.getElementById('reset-zoom');
    const rotateLeftBtn = document.getElementById('rotate-left');
    const rotateRightBtn = document.getElementById('rotate-right');

    if(zoomInBtn) {
        zoomInBtn.addEventListener('click', () => {
            if (radialZoom && radialSvg && radialSvg.node()) {
                const svgNode = radialSvg.node();
                const bbox = svgNode.getBoundingClientRect();
                // Use the center of the visible area as the zoom focus
                const center = [bbox.width / 2, bbox.height / 2];
                radialSvg.transition().duration(400).ease(d3.easeCubicOut)
                    .call(radialZoom.scaleBy, 1.5, center);
            }
        });
    }

     if(zoomOutBtn) {
        zoomOutBtn.addEventListener('click', () => {
            if (radialZoom && radialSvg && radialSvg.node()) {
                const svgNode = radialSvg.node();
                const bbox = svgNode.getBoundingClientRect();
                // Use the center of the visible area as the zoom focus
                const center = [bbox.width / 2, bbox.height / 2];
                radialSvg.transition().duration(400).ease(d3.easeCubicOut)
                    .call(radialZoom.scaleBy, 0.75, center);
            }
        });
    }

    // Add recenter button logic (if not already present)
    const recenterBtn = document.getElementById('reset-zoom');
    if(recenterBtn) {
        recenterBtn.addEventListener('click', () => {
            if (radialZoom && radialSvg) {
                rotation = 0;
                lastGestureRotation = 0;
                const svgNode = radialSvg.node();
                const width = parseFloat(svgNode.getAttribute('width'));
                const height = parseFloat(svgNode.getAttribute('height'));
                radialSvg.transition().duration(600)
                    .call(radialZoom.transform, d3.zoomIdentity.translate(width / 2, height / 2).scale(1));
            }
        });
    }

     if(rotateLeftBtn) {
        rotateLeftBtn.addEventListener('click', () => {
            rotation -= 30;
             lastGestureRotation = rotation; // Keep gesture rotation in sync
            updateRadialRotation(rotation);
        });
    }


    if(rotateRightBtn) {
        rotateRightBtn.addEventListener('click', () => {
            rotation += 30;
             lastGestureRotation = rotation; // Keep gesture rotation in sync
            updateRadialRotation(rotation);
        });
    }


    // Handle window resize
    window.addEventListener('resize', debounce(() => {
        if (currentView === 'radial' && radialSvg) {
            // Re-initialize to adjust layout to new size
            initializeRadialView();
        }
    }, 250));


    // Unpin tooltip on background click - central handler
     d3.select(document.body).on('click.tooltipUnpin', (e) => {
        // Check if the click target is outside the tooltip AND outside any node group
        if (tooltip && !tooltip.contains(e.target) && !e.target.closest('.node')) {
            tooltip.classList.remove('pinned');
            tooltip.classList.remove('visible');
            // Optionally, revert any highlight effects on previously clicked nodes
            d3.selectAll('.node .main-display-circle, .node .category-icon').style('filter', null); // Target main circle and category icon
             d3.selectAll('.node .main-display-circle').each(function(d) {
                 // Revert circle radius based on node type
                 let originalRadius = 10; // Fallback
                 if (d && d.data) { // Check if data is bound
                    if (d.data.nodeType === 'root') originalRadius = radii.root;
                    else if (d.data.nodeType === 'loreal_parent') originalRadius = radii.loreal_parent;
                    else if (d.data.nodeType === 'brand') originalRadius = radii.brand;
                     else if (d3.select(this).classed('category-bg-circle')) originalRadius = radii.category_bg;
                 }
                 d3.select(this).transition().duration(200).attr('r', originalRadius);
             });
              d3.selectAll('.node .category-icon').transition().duration(200).attr('transform', null); // Reset transform for icons
        }
    });
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
 * @param {string} view - The view to switch to ('list' or 'radial')
 */
function switchView(view) {
    const listView = document.getElementById('list-view');
    const radialView = document.getElementById('radial-view');
    const listViewBtn = document.getElementById('list-view-btn');
    const radialViewBtn = document.getElementById('radial-view-btn');

    currentView = view;

    if (view === 'list') {
        listView.classList.remove('hidden');
        radialView.classList.add('hidden');
        if(listViewBtn) listViewBtn.classList.add('active');
        if(radialViewBtn) radialViewBtn.classList.remove('active');
         // Ensure list view content is up to date with filters
         updateListView(allBrands.filter(brand => {
            const regionValue = document.getElementById('region-filter')?.value || 'all';
            const searchValue = document.getElementById('search-input')?.value.toLowerCase() || '';
            const matchesRegion = regionValue === 'all' || brand.region === regionValue;
            const matchesSearch = searchValue === '' ||
                (brand.name && brand.name.toLowerCase().includes(searchValue)) ||
                (brand.description && brand.description.toLowerCase().includes(searchValue)) ||
                (brand.tagline && brand.tagline.toLowerCase().includes(searchValue));
            return matchesRegion && matchesSearch;
        }));

    } else if (view === 'radial') {
        listView.classList.add('hidden');
        radialView.classList.remove('hidden');
        if(listViewBtn) listViewBtn.classList.remove('active');
        if(radialViewBtn) radialViewBtn.classList.add('active');
        // Initialize or update radial diagram
        requestAnimationFrame(() => { // Use rAF to ensure element is visible before init
             initializeRadialView();
             filterBrands(); // Apply filters after re-initialization
        });
    }
}

/**
 * Hide loading screen and show main content
 */
function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    const mainContent = document.getElementById('main-content');
    if (loadingScreen) {
        loadingScreen.style.opacity = '0';
        setTimeout(() => {
            loadingScreen.style.display = 'none'; // Corrected property name
            if (mainContent) {
                mainContent.classList.remove('hidden');
                // Ensure radial view is initialized after layout is updated and visible
                if (currentView === 'radial') {
                    requestAnimationFrame(() => { // Use rAF to ensure layout is settled
                        initializeRadialView();
                        filterBrands(); // Apply initial filters
                    });
                } else {
                     // If starting in list view, render it
                    renderCategories(allBrands); // Render initial list view
                    filterBrands(); // Apply initial filters
                }
            }
        }, 500); // Matches CSS transition duration
    } else {
         // If no loading screen, just show content and initialize
         if (mainContent) mainContent.classList.remove('hidden');
         if (currentView === 'radial') {
             requestAnimationFrame(() => {
                initializeRadialView();
                filterBrands();
             });
         } else {
            renderCategories(allBrands);
            filterBrands();
         }
    }
}


/**
 * Load brand data from JSON file
 */
function loadBrandData() {
    fetch('brands.json')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            // Store brands globally
            allBrands = data;

            // Initialize the current view
            // hideLoadingScreen now calls initializeView based on currentView
            // Check if main-content is hidden to avoid re-initializing if data is just being reloaded
            if (document.getElementById('main-content')?.classList.contains('hidden')) {
                 // Only hide loading screen and init views if not already done
                 hideLoadingScreen();
            } else {
                 // If data is reloaded after initial load (e.g. via a refresh button)
                 if (currentView === 'radial') {
                     initializeRadialView();
                 } else {
                     renderCategories(allBrands);
                 }
                 filterBrands(); // Apply filters after data load
            }

        })
        .catch(error => {
            console.error('Error loading brand data:', error);
            const diagramContainer = document.getElementById('radial-diagram');
            const categoryContainer = document.getElementById('category-view');
            const errorHTML = `
                <div class="no-results" style="margin-top: 50px;">
                    <h2>Error Loading Data</h2>
                    <p>${error.message}</p>
                    <button onclick="location.reload()" style="padding: 10px 20px; cursor: pointer;">Try Again</button>
                </div>
            `;
            if (diagramContainer && currentView === 'radial') {
                 diagramContainer.innerHTML = errorHTML;
            } else if (categoryContainer && currentView === 'list') {
                 categoryContainer.innerHTML = errorHTML;
            } else {
                 // Fallback if no specific container found
                 document.body.innerHTML = errorHTML;
            }

             // Hide loading screen if it's still visible
             const loadingScreen = document.getElementById('loading-screen');
             if (loadingScreen) {
                 loadingScreen.style.opacity = '0';
                 setTimeout(() => { loadingScreen.style.display = 'none'; }, 500);
             }
        });
}

/**
 * Filter brands based on search input and region selection
 */
function filterBrands() {
    const searchValue = document.getElementById('search-input')?.value.toLowerCase() || '';
    const regionValue = document.getElementById('region-filter')?.value || 'all';

    const filteredBrands = allBrands.filter(brand => {
        // Search filter
        const matchesSearch = searchValue === '' ||
            (brand.name && brand.name.toLowerCase().includes(searchValue)) ||
            (brand.description && brand.description.toLowerCase().includes(searchValue)) ||
            (brand.tagline && brand.tagline.toLowerCase().includes(searchValue));

        // Region filter
        const matchesRegion = regionValue === 'all' || brand.region === regionValue;

        return matchesSearch && matchesRegion;
    });

    // Update the current view based on filters
    if (currentView === 'list') {
        updateListView(filteredBrands);
    } else if (currentView === 'radial') {
        updateRadialView(filteredBrands);
    }
}


/**
 * Update the list view with filtered brands
 * @param {Array} filteredBrands - The filtered array of brand objects
 */
function updateListView(filteredBrands) {
    const container = document.getElementById('category-view');
     if (!container) return;

    // Group brands by category (only includes filtered brands)
    const categories = {};
    filteredBrands.forEach(brand => {
        const category = brand.category || 'Uncategorized'; // Handle potential missing category
        if (!categories[category]) {
            categories[category] = [];
        }
        categories[category].push(brand);
    });

    // Clear the container
    container.innerHTML = '';

    // Show no results message if needed
    if (filteredBrands.length === 0) {
        container.innerHTML = `
            <div class="no-results">
                <h2>No brands found</h2>
                <p>Try adjusting your search criteria.</p>
            </div>
        `;
        return;
    }

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
 * Create a brand card element for the list view
 * @param {Object} brand - The brand object
 * @returns {HTMLElement} - The brand card element
 */
function createBrandCard(brand) {
    const card = document.createElement('div');
    card.className = 'brand-card';

    // Use logo_url from the brand object
    const logoUrl = brand.logo_url || 'assets/placeholder.svg'; // Fallback to a placeholder SVG

    // Create card content
    card.innerHTML = `
        <div class="brand-info">
            <div class="brand-logo">
                <img src="${logoUrl}" alt="${brand.name} logo" onerror="this.onerror=null;this.classList.add('svg-placeholder');this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'32\\' height=\\'32\\'><rect width=\\'32\\' height=\\'32\\' fill=\\'%23eee\\'/><text x=\\'16\\' y=\\'20\\' font-size=\\'14\\' text-anchor=\\'middle\\' fill=\\'%23999\\'>?</text></svg>\'\'; this.classList.add('placeholder-icon');">
            </div>
            <div class="brand-details">
                <h3>${brand.name || 'Unknown Brand'}</h3>
                <p class="brand-tagline">${brand.tagline || ''}</p>
            </div>
        </div>
        <p class="brand-description">${brand.description || 'No description available.'}</p>
        <div class="brand-tags">
            <span class="tag">${brand.category || 'Uncategorized'}</span>
            <span class="tag">${brand.region || 'Unknown Region'}</span>
             ${brand.parent_brand ? `<span class="tag">Part of ${brand.parent_brand}</span>` : ''}
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
    const modal = document.getElementById('brand-modal');
    const detailContent = document.getElementById('brand-detail-content');

    if (!modal || !detailContent) {
        console.error('Modal elements not found.');
        return;
    }

    const logoUrl = brand.logo_url || 'assets/placeholder.svg'; // Fallback

    // Create modal content
    detailContent.innerHTML = `
        <div class="modal-logo">
            <img src="${logoUrl}" alt="${brand.name} logo" onerror="this.onerror=null;this.classList.add('svg-placeholder');this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'32\\' height=\\'32\\'><rect width=\\'32\\' height=\\'32\\' fill=\\'%23eee\\'/><text x=\\'16\\' y=\\'20\\' font-size=\\'14\\' text-anchor=\\'middle\\' fill=\\'%23999\\'>?</text></svg>\'\'; this.classList.add('placeholder-icon');">
        </div>
        <h2 class="modal-brand-name">${brand.name || 'Unknown Brand'}</h2>
        <p class="modal-brand-tagline">"${brand.tagline || 'No tagline available.'}"</p>

        <div class="modal-section">
            <h3>About</h3>
            <p>${brand.description || 'No description available.'}</p>
        </div>

        <div class="modal-section">
            <h3>Details</h3>
            <p><strong>Category:</strong> ${brand.category || 'Uncategorized'}</p>
            <p><strong>Region:</strong> ${brand.region || 'Unknown Region'}</p>
             ${brand.parent_brand ? `<p><strong>Parent Brand:</strong> ${brand.parent_brand}</p>` : ''}
        </div>

        <div class="brand-tags">
            <span class="tag">${brand.category || 'Uncategorized'}</span>
            <span class="tag">${brand.region || 'Unknown Region'}</span>
             ${brand.parent_brand ? `<span class="tag">Part of ${brand.parent_brand}</span>` : ''}
        </div>
        ${brand.website ? `<div class="modal-section"><h3>Website</h3><p><a href="${brand.website}" target="_blank">${brand.website}</a></p></div>` : ''}
    `;

    // Show the modal with animation
    modal.classList.add('show');
}

/**
 * Prepare data for radial visualization
 * @returns {Object} - Hierarchical data structure for D3
 */
function prepareRadialData() {
    const rootNode = {
        name: "Nestlé",
        nodeType: 'root',
        iconUrl: 'assets/nestle.png', // Specific logo for the root
        description: "Global leader in food and beverage.",
        children: []
    };

    let lorealParentNodeData = allBrands.find(brand => brand.name === "L'Oréal");
    let lorealParentNode = null;

    // Separate direct Nestlé brands and L'Oréal brands
    const directNestleBrands = [];
    const lorealBrands = [];

    allBrands.forEach(brand => {
         if (brand.name === "L'Oréal" && lorealParentNodeData) {
             // Handled separately to ensure it's the parent node data
         } else if (brand.parent_brand === "L'Oréal") {
             lorealBrands.push(brand);
         } else {
             directNestleBrands.push(brand);
         }
    });

    // Build L'Oréal hierarchy if L'Oréal data exists
    if (lorealParentNodeData) {
        lorealParentNode = {
            ...lorealParentNodeData, // Spread existing brand info
            nodeType: 'loreal_parent', // Special type for L'Oréal parent
            iconUrl: lorealParentNodeData.logo_url, // L'Oréal's own logo
            children: []
        };

        const lorealSubCategories = {
            Fashion: {
                name: "Fashion",
                nodeType: 'category',
                iconUrl: 'assets/fashion.svg',
                isLorealCategory: true,
                children: []
            },
            Cosmetics: {
                name: "Cosmetics",
                nodeType: 'category',
                iconUrl: 'assets/cosmetics.svg',
                isLorealCategory: true,
                children: []
            }
        };

        lorealBrands.forEach(brand => {
             brand.nodeType = 'brand'; // Ensure nodeType is set for brands
            if (brand.category === "Fashion" && lorealSubCategories.Fashion) {
                lorealSubCategories.Fashion.children.push(brand);
            } else if (brand.category === "Cosmetics" && lorealSubCategories.Cosmetics) {
                lorealSubCategories.Cosmetics.children.push(brand);
            } else {
                 console.warn(`L'Oréal brand "${brand.name}" has unexpected category: ${brand.category}`);
                 // Optional: Add to a default L'Oréal sub-category or directly under L'Oréal parent
            }
        });

        // Add populated sub-categories to L'Oréal parent
        if (lorealSubCategories.Fashion.children.length > 0) {
            lorealParentNode.children.push(lorealSubCategories.Fashion);
        }
        if (lorealSubCategories.Cosmetics.children.length > 0) {
            lorealParentNode.children.push(lorealSubCategories.Cosmetics);
        }

        // Add L'Oréal parent node to the root only if it has children (sub-categories with brands)
         if (lorealParentNode.children.length > 0) {
             rootNode.children.push(lorealParentNode);
         }

    } else if (lorealBrands.length > 0) {
         console.warn("Found L'Oréal brands but no L'Oréal parent entry in brands.json. Adding them as direct Nestlé brands under their categories.");
         // If L'Oréal parent is missing, add its brands directly under Nestlé in their categories
         lorealBrands.forEach(brand => directNestleBrands.push(brand));
    }


    // Group direct Nestlé brands by category
    const directNestleCategories = {};
    directNestleBrands.forEach(brand => {
        brand.nodeType = 'brand'; // Ensure nodeType is set for brands
        const categoryName = brand.category || 'Uncategorized'; // Handle potential missing category

        if (!directNestleCategories[categoryName]) {
            // Normalize category name for SVG filename
            let svgFileName = categoryName.toLowerCase().replace(/[^a-z0-9]+/g, '_');
             // Correct specific names if needed (e.g., "pet_care")
             if (categoryName === "Pet_Care") svgFileName = "pet_care";
             if (categoryName === "Icecream") svgFileName = "icecream";
             if (categoryName === "Cereal") svgFileName = "cereal";
             if (categoryName === "Beauty & Personal Care") svgFileName = "cosmetics"; // Map old category to a new SVG


            directNestleCategories[categoryName] = {
                name: categoryName,
                nodeType: 'category',
                iconUrl: `assets/${svgFileName}.svg`, // Path to category SVG icon
                children: []
            };
        }
        directNestleCategories[categoryName].children.push(brand);
    });

    // Add direct Nestlé categories to the root
    for (const categoryKey in directNestleCategories) {
        if (directNestleCategories[categoryKey].children.length > 0) {
            rootNode.children.push(directNestleCategories[categoryKey]);
        }
    }

     // Sort root children for consistent layout (e.g., alphabetically by name)
    rootNode.children.sort((a, b) => a.name.localeCompare(b.name));
     // Sort category children (brands)
     rootNode.children.forEach(child => {
         if (child.children) {
             child.children.sort((a, b) => a.name.localeCompare(b.name));
             // If child is L'Oréal, sort its sub-categories and their children
             if (child.nodeType === 'loreal_parent') {
                 child.children.sort((a, b) => a.name.localeCompare(b.name)); // Sort Fashion/Cosmetics sub-categories
                 child.children.forEach(subchild => {
                     if (subchild.children) {
                         subchild.children.sort((a, b) => a.name.localeCompare(b.name)); // Sort brands under Fashion/Cosmetics
                     }
                 });
             }
         }
     });


    return rootNode;
}


/**
 * Initialize the radial view diagram using D3.js
 */
function initializeRadialView() {
    // Clear the previous diagram
    const diagramContainer = document.getElementById('radial-diagram');
    if (!diagramContainer) {
        console.error('Radial diagram container not found.');
        return;
    }
    diagramContainer.innerHTML = ''; // Clear everything

    // Re-create flexWrap and its children if they were removed or not present
    let flexWrap = d3.select('#radial-diagram').select('#radial-flex-wrap');
    if (flexWrap.empty()) {
        flexWrap = d3.select('#radial-diagram')
            .append('div')
            .attr('id', 'radial-flex-wrap');
    } else {
        flexWrap.html(''); // Clear existing content of flexWrap
    }

     // Append legend and svg-wrap containers within flexWrap
     flexWrap.style('display', 'flex') // Ensure flex properties are applied
             .style('flex-direction', 'row')
             .style('align-items', 'center')
             .style('justify-content', 'center');

     flexWrap.append('div') // Legend container
        .attr('id', 'radial-legend')
        .style('display', 'flex')
        .style('flex-direction', 'column')
        .style('align-items', 'flex-end')
        .style('gap', '18px')
        .style('margin-right', '24px')
        .style('min-width', '120px');


    const svgWrap = flexWrap.append('div') // SVG container
        .attr('id', 'radial-svg-wrap')
        .style('flex', '1')
        .style('display', 'flex')
        .style('align-items', 'center')
        .style('justify-content', 'center')
        .style('width', '100%')
        .style('height', '100%')
        .style('min-width', '0'); // Allow shrinking

    // Responsive width/height based on container
    const wrapRect = diagramContainer.getBoundingClientRect();
    const width = Math.max(400, wrapRect.width || 600);
    const height = Math.max(400, wrapRect.height || 600);

    // Adjusted radius calculation
    const baseRadius = Math.min(width, height) / 2 - 40; // Increased margin for text if needed later, or larger icons

    radialSvg = d3.select(svgWrap.node())
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .attr('viewBox', `0 0 ${width} ${height}`)
        .attr('preserveAspectRatio', 'xMidYMid meet'); // Maintain aspect ratio

    // Ensure defs section exists for patterns
    let defs = radialSvg.select('defs');
    if (defs.empty()) {
        defs = radialSvg.insert('defs', ':first-child');
    }

    const g = radialSvg.append('g'); // No initial transform

    // Add a subgroup for zoom/rotate transforms
    const zoomContent = g.append('g').attr('class', 'zoom-content');

    radialZoom = d3.zoom()
        .scaleExtent([0.3, 5])
        .on('zoom', (event) => {
            zoomContent.attr(
                'transform',
                `translate(${event.transform.x},${event.transform.y}) scale(${event.transform.k}) rotate(${rotation})`
            );
        });

    // Apply zoom behavior to the SVG and set initial transform to center
    radialSvg.call(radialZoom)
        .call(radialZoom.transform, d3.zoomIdentity.translate(width / 2, height / 2)); // Initial transform

    // Apply initial rotation if any, ensuring scale is part of the transform
     updateRadialRotation(rotation);

    const radialData = prepareRadialData();

    // Use cluster layout - angle in degrees, radius is distance from center
    const cluster = d3.cluster().size([360, baseRadius]);
    const root = d3.hierarchy(radialData);

    // Assign x and y coordinates based on the cluster layout
    cluster(root);

    // Draw links
    const linksGroup = zoomContent.append('g').attr('class', 'links');
    linksGroup.selectAll('.link')
        .data(root.links())
        .enter()
        .append('path')
        .attr('class', 'link')
        .attr('d', d3.linkRadial()
            .angle(d => d.x * Math.PI / 180) // Convert degrees to radians
            .radius(d => d.y)) // Use the radius from the cluster layout
        .attr('opacity', 0)
        .transition().duration(600)
        .attr('opacity', 1); // Fade in links

    // Draw nodes
    const nodesGroup = zoomContent.append('g').attr('class', 'nodes');
    const nodeEnter = nodesGroup.selectAll('.node')
        .data(root.descendants())
        .enter()
        .append('g')
        .attr('class', d => {
            let classes = 'node';
            const nodeData = d.data;
            const nodeType = nodeData.nodeType;

            if (nodeType === 'root') classes += ' root-node';
            else if (nodeType === 'loreal_parent') classes += ' loreal-parent-node parent-node';
            else if (nodeType === 'category') classes += ' category-node parent-node';
            else if (nodeType === 'brand') classes += ' brand-node';
            else if (d.children) classes += ' parent-node'; // Fallback for any other parent types

            // Add category class for styling/filtering, using normalized names
             if (nodeData.category) {
                classes += ' category-' + nodeData.category.toLowerCase().replace(/[^a-z0-9]+/g, '-');
            } else if (nodeType === 'category' && nodeData.name) {
                 classes += ' category-' + nodeData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
            }


            return classes;
        })
        // Position nodes using the project function
        .attr('transform', d => `translate(${project(d.x, d.y)})`)
        .attr('opacity', 0); // Initial opacity for fade-in

    // Fade in nodes
    nodeEnter.transition().duration(600).attr('opacity', 1);

    // Append visual elements (circles, images, patterns) based on node type
    nodeEnter.each(function(d) {
        const nodeElement = d3.select(this);
        const nodeData = d.data;
        const nodeType = nodeData.nodeType;

        let imageUrl = null;
        let currentRadius;

        if (nodeType === 'category') {
            // Add a background circle for category nodes
            nodeElement.append('circle')
                .attr('class', 'category-bg-circle')
                .attr('r', radii.category_bg)
                .style('fill', colorMap[nodeData.name] || 'var(--category-circle-fill, rgba(200, 200, 200, 0.5))') // Use colorMap for fill
                .style('stroke', colorMap[nodeData.name] || 'var(--category-circle-fill, rgba(200, 200, 200, 0.5))') // Border matches fill
                .style('stroke-width', '2px');

            // Add the SVG image
            if (nodeData.iconUrl) {
                nodeElement.append('image')
                    .attr('class', 'category-icon')
                    .attr('href', nodeData.iconUrl)
                    .attr('x', -categoryIconSize / 2) // Center the image
                    .attr('y', -categoryIconSize / 2) // Center the image
                    .attr('width', categoryIconSize)
                    .attr('height', categoryIconSize)
                    .attr('preserveAspectRatio', 'xMidYMid meet'); // Maintain aspect ratio
            }
        } else if (nodeType === 'brand' || nodeType === 'root' || nodeType === 'loreal_parent') {
            // These node types use circles filled with patterns (logos)
            imageUrl = nodeType === 'brand' ? nodeData.logo_url : nodeData.iconUrl; // Use logo_url for brand, iconUrl for root/loreal
            if (nodeType === 'root') currentRadius = radii.root;
            else if (nodeType === 'loreal_parent') currentRadius = radii.loreal_parent;
            else currentRadius = radii.brand;

            // For brand, root, and loreal_parent nodes, add a white-ish background circle with black border
            if (nodeType === 'brand' || nodeType === 'root' || nodeType === 'loreal_parent') {
                nodeElement.append('circle')
                    .attr('class', nodeType + '-bg-circle')
                    .attr('r', currentRadius)
                    .style('fill', '#fff')
                    .style('stroke', '#111')
                    .style('stroke-width', '2px');
            }

            const circle = nodeElement.append('circle')
                .attr('class', 'main-display-circle') // Class for styling and event targeting
                .attr('r', currentRadius);

            if (imageUrl) {
                // Create a unique ID for the pattern based on node data
                const safeNamePart = (nodeData.name || '').replace(/[^a-zA-Z0-9]/g, '').substring(0, 10);
                const patternId = `pattern-${safeNamePart}-${d.id || Math.random().toString(36).substr(2, 5)}`;

                // Check if the image is a PNG/JPG/JPEG
                const isRaster = /\.(png|jpg|jpeg)$/i.test(imageUrl);
                let pattern;
                if (isRaster) {
                    // For PNG/JPG, use userSpaceOnUse and set size to node diameter, centered
                    pattern = defs.append('pattern')
                        .attr('id', patternId)
                        .attr('patternUnits', 'userSpaceOnUse')
                        .attr('x', -currentRadius)
                        .attr('y', -currentRadius)
                        .attr('width', 2 * currentRadius)
                        .attr('height', 2 * currentRadius);
                    pattern.append('image')
                        .attr('href', imageUrl)
                        .attr('x', 0)
                        .attr('y', 0)
                        .attr('width', 2 * currentRadius)
                        .attr('height', 2 * currentRadius)
                        .attr('preserveAspectRatio', 'xMidYMid meet');
                } else {
                    // For SVG, use objectBoundingBox and normalized sizing
                    pattern = defs.append('pattern')
                        .attr('id', patternId)
                        .attr('patternUnits', 'objectBoundingBox')
                        .attr('width', 1)
                        .attr('height', 1);
                    pattern.append('image')
                        .attr('href', imageUrl)
                        .attr('x', 0)
                        .attr('y', 0)
                        .attr('width', 1)
                        .attr('height', 1)
                        .attr('preserveAspectRatio', 'xMidYMid meet');
                }
                // Fill the circle with the pattern
                circle.style('fill', `url(#${patternId})`);
            } else {
                // Fallback fill color if no image URL
                circle.style('fill', 'var(--card-bg)');
            }
            // Apply stroke and cursor based on node type
            if (nodeType === 'root' || nodeType === 'loreal_parent') {
                circle.style('stroke', 'none'); // No stroke for the pattern circle, border is on the bg circle
            } else if (nodeType === 'brand') {
                circle.style('stroke', 'none'); // No stroke for the pattern circle, border is on the bg circle
            }
            circle.style('cursor', nodeType === 'brand' ? 'pointer' : 'default');

        } else { // Fallback for any other unknown node types
             nodeElement.append('circle')
                .attr('class', 'main-display-circle')
                .attr('r', 10) // Smaller default radius
                .style('fill', 'var(--secondary-text)'); // Neutral color
        }
    });

    // REMOVED: Code that appended text labels

    // Add/Update the legend (modify addRadialLegend to handle new categories/structure if needed)
    // For now, let's keep the existing addRadialLegend which uses text labels and colors.
    // It might need updates to accurately reflect the new hierarchy or use category SVGs in the legend.
    addRadialLegend();

    // --- Event Handlers ---
    // Use a common class or select for both circles and images for hover/click effects
    // Targeting .main-display-circle and .category-icon
    const interactiveElements = nodeEnter.selectAll('.main-display-circle, .category-icon');


    interactiveElements.on('mouseenter', function(event, d) {
        // Prevent hover effects on the root node unless specifically desired
         if (d.data.nodeType === 'root' && !event.currentTarget.classList.contains('category-icon')) return;
        if (tooltip.classList.contains('pinned')) return;

        // Legend highlight - Update to work with category names
        if (d.data.category || (d.data.nodeType === 'category' && d.data.name)) {
            const categoryToHighlight = d.data.nodeType === 'category' ? d.data.name : d.data.category;
             // Normalize category name for comparison if necessary (e.g., Pet_Care vs pet_care)
             const normalizedCategory = categoryToHighlight.replace(/_/g, ' '); // Simple normalization for legend text

            const legendItems = document.querySelectorAll(`#radial-legend div`);
            legendItems.forEach(item => {
                 // Compare normalized text content
                if (item.textContent.trim().toLowerCase().includes(normalizedCategory.toLowerCase())) {
                    item.style.background = 'var(--hover-color)'; // Use a themed hover color
                    item.style.fontWeight = 'bold';
                     // Optional: Add a subtle border or shadow to the legend item
                }
            });
        }

        // Tooltip content generation
        let tooltipContent = `<div style="display:flex;align-items:center;gap:10px;">`;
        // Use iconUrl for category/root/loreal, logo_url for brand for tooltip image
        const tooltipImageUrl = d.data.nodeType === 'brand' ? d.data.logo_url : d.data.iconUrl;

        if (tooltipImageUrl) {
            tooltipContent += `<img src="${tooltipImageUrl}" alt="${d.data.name} logo/icon" style="width:32px;height:32px;border-radius: ${d.data.nodeType === 'category' ? '4px' : '50%'};background:#eee;object-fit:contain; border: 1px solid #ccc;">`;
        }
        tooltipContent += `<strong>${d.data.name || 'Unknown'}</strong></div>`; // Ensure name is displayed

        // Add details based on node type
        if (d.data.nodeType === 'root') {
             if (d.data.description) tooltipContent += `<br><p style='font-size:0.9em; color:var(--secondary-text);'>${d.data.description}</p>`;
        } else if (d.data.nodeType === 'loreal_parent') {
             if (d.data.description) tooltipContent += `<br><p style='font-size:0.9em; color:var(--secondary-text);'>${d.data.description}</p>`;
             const fashionCount = d.children?.find(c => c.data.name === "Fashion")?.children.length || 0;
             const cosmeticsCount = d.children?.find(c => c.data.name === "Cosmetics")?.children.length || 0;
             if (fashionCount > 0) tooltipContent += `<br><span style='color:var(--secondary-text); font-size:0.9em;'>Fashion Brands: ${fashionCount}</span>`;
             if (cosmeticsCount > 0) tooltipContent += `<br><span style='color:var(--secondary-text); font-size:0.9em;'>Cosmetics Brands: ${cosmeticsCount}</span>`;

        } else if (d.data.nodeType === 'category') {
             if (d.data.children) tooltipContent += `<br><span style='color:var(--secondary-text); font-size:0.9em;'>Contains: ${d.data.children.length} items</span>`;

        } else if (d.data.nodeType === 'brand') { // Brand node
            if (d.data.tagline) tooltipContent += `<br><em>${d.data.tagline}</em>`;
            if (d.data.region) tooltipContent += `<br><span style='color:var(--secondary-text);'>Region: ${d.data.region}</span>`;
             if (d.data.description) tooltipContent += `<br><p style='font-size:0.9em; color:var(--secondary-text);'>${d.data.description}</p>`; // Added description to brand tooltip

        }

        // Add website link if available for any node with a website property
        if (d.data.website) {
             tooltipContent += `<br><a href='${d.data.website}' target='_blank' style='color:var(--nestle-blue); text-decoration:none;'>Website</a>`;
        }


        tooltip.innerHTML = tooltipContent;
        tooltip.style.left = (event.pageX + 10) + 'px';
        tooltip.style.top = (event.pageY + 10) + 'px';
        tooltip.classList.add('visible');

        // Apply hover effect: scale and shadow
        const targetElement = d3.select(event.currentTarget);
        const visualElement = targetElement.select('.main-display-circle, .category-icon');

         if (!visualElement.empty()) {
             if (visualElement.node().tagName === 'circle') { // It's a circle (brand, root, loreal)
                 const originalRadius = visualElement.attr('r');
                 visualElement.transition().duration(200).attr('r', parseFloat(originalRadius) * 1.2);
             } else if (visualElement.node().tagName === 'image') { // It's an image (category icon)
                 visualElement.transition().duration(200).attr('transform', 'scale(1.2)');
             }
             visualElement.style('filter', 'drop-shadow(0 0 8px var(--nestle-blue))');
         }


    })
    .on('mousemove', (event) => {
        if (tooltip.classList.contains('pinned')) return;
        // Update tooltip position
        tooltip.style.left = (event.pageX + 10) + 'px';
        tooltip.style.top = (event.pageY + 10) + 'px';
    })
    .on('mouseleave', function(event, d) {
        if (tooltip.classList.contains('pinned')) return;

        // Remove legend highlight
        const legendItems = document.querySelectorAll(`#radial-legend div`);
        legendItems.forEach(item => {
            item.style.background = '';
            item.style.fontWeight = '';
            // Optional: Remove added border or shadow from legend item
        });
        tooltip.classList.remove('visible'); // Hide tooltip if not pinned

        // Revert hover effect: scale and shadow
        const targetElement = d3.select(event.currentTarget);
        const visualElement = targetElement.select('.main-display-circle, .category-icon');

         if (!visualElement.empty()) {
             if (visualElement.node().tagName === 'circle') { // It's a circle
                let originalRadius;
                if (d.data.nodeType === 'root') originalRadius = radii.root;
                else if (d.data.nodeType === 'loreal_parent') originalRadius = radii.loreal_parent;
                else if (d.data.nodeType === 'brand') originalRadius = radii.brand;
                 // If it's a category-bg-circle, revert to its specific radius
                 else if (visualElement.classed('category-bg-circle')) originalRadius = radii.category_bg;
                 else originalRadius = 10; // Fallback for unknown

                visualElement.transition().duration(200).attr('r', originalRadius);
             } else if (visualElement.node().tagName === 'image') { // It's an image
                 visualElement.transition().duration(200).attr('transform', null); // Reset transform
             }
             visualElement.style('filter', null); // Remove filter
         }
    });

    // Pin tooltip on click/tap for interactive nodes
    // Target brand, category, loreal_parent nodes
    nodeEnter.filter(d => d.data.nodeType !== 'root') // Exclude root from pinning behavior if desired, or include it
        .style('cursor', d => d.data.nodeType === 'brand' ? 'pointer' : 'pointer') // Set cursor for clickables
        .on('click', function(event, d) {
            event.stopPropagation(); // Prevent body click from unpinning immediately
            // If the clicked node is already pinned, unpin it
            if (tooltip.classList.contains('pinned') && d3.select(this).classed('tooltip-pinned-source')) {
                tooltip.classList.remove('pinned', 'visible');
                d3.selectAll('.tooltip-pinned-source').classed('tooltip-pinned-source', false); // Remove marker from all nodes
                // Revert hover effect on this node
                 const visualElement = d3.select(this).select('.main-display-circle, .category-icon');
                  if (!visualElement.empty()) {
                     if (visualElement.node().tagName === 'circle') {
                         let originalRadius;
                        if (d.data.nodeType === 'loreal_parent') originalRadius = radii.loreal_parent;
                        else if (d.data.nodeType === 'brand') originalRadius = radii.brand;
                         else if (visualElement.classed('category-bg-circle')) originalRadius = radii.category_bg;
                         else originalRadius = 10;
                         visualElement.transition().duration(200).attr('r', originalRadius);
                     } else if (visualElement.node().tagName === 'image') {
                         visualElement.transition().duration(200).attr('transform', null);
                     }
                      visualElement.style('filter', null);
                 }
                return;
            }

             // Remove pinned class from previous source if any
            d3.selectAll('.tooltip-pinned-source').classed('tooltip-pinned-source', false);
            // Mark the current node as the source of the pinned tooltip
            d3.select(this).classed('tooltip-pinned-source', true);


            // Generate tooltip content (similar to mouseenter)
             let tooltipContent = `<div style="display:flex;align-items:center;gap:10px;">`;
            const tooltipImageUrl = d.data.nodeType === 'brand' ? d.data.logo_url : d.data.iconUrl;

            if (tooltipImageUrl) {
                tooltipContent += `<img src="${tooltipImageUrl}" alt="${d.data.name} logo/icon" style="width:32px;height:32px;border-radius: ${d.data.nodeType === 'category' ? '4px' : '50%'};background:#eee;object-fit:contain; border: 1px solid #ccc;">`;
            }
            tooltipContent += `<strong>${d.data.name || 'Unknown'}</strong></div>`;

            if (d.data.nodeType === 'root') {
                 if (d.data.description) tooltipContent += `<br><p style='font-size:0.9em; color:var(--secondary-text);'>${d.data.description}</p>`;
            } else if (d.data.nodeType === 'loreal_parent') {
                 if (d.data.description) tooltipContent += `<br><p style='font-size:0.9em; color:var(--secondary-text);'>${d.data.description}</p>`;
                const fashionCount = d.children?.find(c => c.data.name === "Fashion")?.children.length || 0;
                const cosmeticsCount = d.children?.find(c => c.data.name === "Cosmetics")?.children.length || 0;
                if (fashionCount > 0) tooltipContent += `<br><span style='color:var(--secondary-text); font-size:0.9em;'>Fashion Brands: ${fashionCount}</span>`;
                if (cosmeticsCount > 0) tooltipContent += `<br><span style='color:var(--secondary-text); font-size:0.9em;'>Cosmetics Brands: ${cosmeticsCount}</span>`;

            } else if (d.data.nodeType === 'category') {
                 if (d.data.children) tooltipContent += `<br><span style='color:var(--secondary-text); font-size:0.9em;'>Contains: ${d.data.children.length} items</span>`;

            } else if (d.data.nodeType === 'brand') { // Brand node
                if (d.data.tagline) tooltipContent += `<br><em>${d.data.tagline}</em>`;
                if (d.data.region) tooltipContent += `<br><span style='color:var(--secondary-text);'>Region: ${d.data.region}</span>`;
                 if (d.data.description) tooltipContent += `<br><p style='font-size:0.9em; color:var(--secondary-text);'>${d.data.description}</p>`;

            }

            if (d.data.website) {
                 tooltipContent += `<br><a href='${d.data.website}' target='_blank' style='color:var(--nestle-blue); text-decoration:none;'>Website</a>`;
            }

            tooltip.innerHTML = tooltipContent;
            tooltip.classList.add('visible', 'pinned'); // Make visible and pinned
            // Position tooltip near the clicked element or mouse
            const rect = event.currentTarget.getBoundingClientRect();
            tooltip.style.left = (rect.left + window.scrollX + (rect.width / 2) + 15) + 'px';
            tooltip.style.top = (rect.top + window.scrollY + (rect.height / 2) + 15) + 'px';

        });


    // Add touch support for zoom and rotate (using the separate variables)
    let lastTouchDist = null;
    let lastTouchAngle = null;

    const svgNode = radialSvg ? radialSvg.node() : null;
    if(svgNode) {
        svgNode.addEventListener('touchstart', function(e) {
            if (e.touches.length === 2) {
                e.preventDefault(); // Prevent page scroll
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                lastTouchDist = Math.sqrt(dx * dx + dy * dy);
                lastTouchAngle = Math.atan2(dy, dx) * 180 / Math.PI;
                lastGestureRotation = rotation; // Capture current rotation at gesture start
            }
        }, { passive: false });

        svgNode.addEventListener('touchmove', function(e) {
            if (e.touches.length === 2) {
                e.preventDefault(); // Prevent page scroll

                // --- Pinch Zoom ---
                const dxDist = e.touches[0].clientX - e.touches[1].clientX;
                const dyDist = e.touches[0].clientY - e.touches[1].clientY;
                const dist = Math.sqrt(dxDist * dxDist + dyDist * dyDist);
                const scaleAmount = dist / lastTouchDist;

                if(radialZoom) {
                    // Use the visual center of the SVG in the browser window
                    const rect = svgNode.getBoundingClientRect();
                    const clientX = rect.left + rect.width / 2;
                    const clientY = rect.top + rect.height / 2;
                    const pt = svgNode.createSVGPoint();
                    pt.x = clientX;
                    pt.y = clientY;
                    const svgPoint = pt.matrixTransform(svgNode.getScreenCTM().inverse());
                    radialSvg.call(radialZoom.scaleBy, scaleAmount, [svgPoint.x, svgPoint.y]);
                }
                lastTouchDist = dist; // Update for next move

                // --- Rotation ---
                const dxAngle = e.touches[0].clientX - e.touches[1].clientX;
                const dyAngle = e.touches[0].clientY - e.touches[1].clientY;
                const angle = Math.atan2(dyAngle, dxAngle) * 180 / Math.PI;
                const deltaAngle = angle - lastTouchAngle;
                rotation = lastGestureRotation + deltaAngle; // Update global rotation

                updateRadialRotation(rotation); // Apply the new rotation (which uses current zoom scale)
            }
        }, { passive: false });

        svgNode.addEventListener('touchend', function(e) {
            if (e.touches.length < 2) { // Reset when less than 2 touches remain
                lastTouchDist = null;
                lastTouchAngle = null;
                // lastGestureRotation is updated at the start of a new gesture
            }
        });
    }


    // Apply initial filtering after nodes are created
    updateRadialView(allBrands.filter(brand => {
        const regionValue = document.getElementById('region-filter')?.value || 'all';
        const searchValue = document.getElementById('search-input')?.value.toLowerCase() || '';
        const matchesRegion = regionValue === 'all' || brand.region === regionValue;
        const matchesSearch = searchValue === '' ||
            (brand.name && brand.name.toLowerCase().includes(searchValue)) ||
            (brand.description && brand.description.toLowerCase().includes(searchValue)) ||
            (brand.tagline && brand.tagline.toLowerCase().includes(searchValue));
        return matchesRegion && matchesSearch;
    }));
}

/**
 * Update the radial view rotation
 * @param {number} angle - Rotation angle in degrees
 */
function updateRadialRotation(angle) {
    const diagramContainer = document.getElementById('radial-diagram');
    const svgElement = diagramContainer ? diagramContainer.querySelector('#radial-svg-wrap svg') : null;
    if (!svgElement) return;

    // Get current dimensions from the SVG element itself
    const width = parseFloat(svgElement.getAttribute('width')) || 600;
    const height = parseFloat(svgElement.getAttribute('height')) || 600;

    const zoomContent = radialSvg ? radialSvg.select('.zoom-content') : null;
    if (!zoomContent) return;

    // Get current transform from D3 zoom behavior
    let currentTransform = d3.zoomIdentity;
     if (radialZoom && radialSvg && radialSvg.node()) {
        currentTransform = d3.zoomTransform(radialSvg.node());
    }

    // For smooth rotation, use a transition
    zoomContent.transition().duration(400).ease(d3.easeCubicOut)
        .attr('transform', `translate(${currentTransform.x},${currentTransform.y}) scale(${currentTransform.k}) rotate(${angle})`);

    // Update the global rotation variable for gesture handling
    rotation = angle; // Ensure the global variable stays in sync
}


/**
 * Update the radial view with filtered brands
 * @param {Array} filteredBrands - The filtered array of brand objects
 */
function updateRadialView(filteredBrands) {
    if (!radialSvg) {
        console.error('radialSvg is not initialized.');
        return;
    }

    // Get the names of brands that should be visible based on filters
    const visibleBrandNames = new Set(filteredBrands
        .filter(d => d.nodeType === 'brand' || !d.nodeType) // Consider items with no nodeType as potential brands too
        .map(b => b.name)
        .filter(name => name)); // Ensure names are not null or undefined

     // Determine which nodes (brands, categories, parents) should be visible.
     // A node should be visible if it's the root, the L'Oréal parent (if it contains visible children),
     // a category (if it contains visible brands), or a brand that matches the filter.

     const visibleNodeNames = new Set();

     // Start building the set of visible nodes from the filtered brands
     filteredBrands.forEach(brand => {
         if (brand.name) {
             visibleNodeNames.add(brand.name); // Add the brand name itself
         }
     });


    // Now, traverse the hierarchy from the root to mark all necessary ancestors as visible
    // Find the root node data in the current D3 layout data
    const rootNodeData = radialSvg.select('.root-node').data()[0]?.data; // Get the raw data from the root node

    if (rootNodeData) {
        function markAncestorsVisible(nodeData) {
            if (!nodeData || !nodeData.name) return;

            // If this node is in the set of visible brands OR
            // If any of its children (recursively) are in the set of visible brands,
            // then this node itself should be visible.
            let anyDescendantVisible = false;
            if (nodeData.children) {
                 // Need to get hierarchy descendants to check recursively
                 const hierarchyNode = d3.hierarchy(nodeData);
                 hierarchyNode.descendants().slice(1).forEach(desc => { // Exclude self
                     if (visibleBrandNames.has(desc.data.name)) {
                          anyDescendantVisible = true;
                     }
                 });
            }

            if (visibleBrandNames.has(nodeData.name) || anyDescendantVisible) {
                visibleNodeNames.add(nodeData.name);
                // Also mark its parent as visible
                const parentNode = allBrands.find(b => b.name === nodeData.parent_brand);
                if (parentNode && parentNode.name !== rootNodeData.name) { // Don't need to explicitly mark Nestlé root again
                     visibleNodeNames.add(parentNode.name);
                     // Recursively mark ancestors up to the root
                     markAncestorsVisible(parentNode);
                } else if (nodeData.nodeType === 'category' || nodeData.nodeType === 'loreal_parent') {
                    // If it's a category or loreal parent, its parent in the visualization is Nestlé root, which is handled.
                }
            }
        }

        // Rebuild a temporary hierarchy from allBrands to easily traverse parents
         const tempHierarchy = d3.hierarchy({
             name: "Nestlé",
             children: allBrands.map(b => ({...b})) // Create a copy to add hierarchy properties
         });

         // Map name to the temporary hierarchy node for quick lookup
         const nameToTempNode = new Map(tempHierarchy.descendants().map(d => [d.data.name, d]));

         // Mark visible brands and their ancestors
         filteredBrands.forEach(brand => {
             let currentNodeData = brand;
             while(currentNodeData && currentNodeData.name !== "Nestlé") {
                 if (currentNodeData.name) visibleNodeNames.add(currentNodeData.name);
                 const tempNode = nameToTempNode.get(currentNodeData.name);
                 currentNodeData = tempNode?.parent?.data; // Move up the hierarchy
             }
              if (rootNodeData && rootNodeData.name) visibleNodeNames.add(rootNodeData.name); // Always ensure root is added

         });
         // Add the L'Oréal node explicitly if it contains any visible descendant
         const lorealNodeData = allBrands.find(b => b.name === "L'Oréal");
         if(lorealNodeData) {
              const lorealHierarchyNode = nameToTempNode.get(lorealNodeData.name);
               if (lorealHierarchyNode && lorealHierarchyNode.descendants().some(desc => visibleBrandNames.has(desc.data.name))) {
                  visibleNodeNames.add(lorealNodeData.name);
               }
         }


        // Add Category and L'Oréal sub-category names if they contain visible brands
         radialSvg.selectAll('.node').each(function(d) {
             if (d.data.nodeType === 'category' || d.data.nodeType === 'loreal_parent') {
                 // Check if this category/parent contains any visible brand descendants in the original filtered list
                 const containsVisibleBrand = filteredBrands.some(brand => {
                     let parent = brand;
                     while(parent) {
                          if (parent.name === d.data.name) return true;
                          // Find the parent in the allBrands list to get its parent_brand
                          const parentBrandData = allBrands.find(b => b.name === parent.parent_brand);
                          parent = parentBrandData; // Move up using parent_brand link
                     }
                     return false; // Brand is not a descendant of this node
                 });

                 if (containsVisibleBrand) {
                     visibleNodeNames.add(d.data.name);
                 }
             }
         });


    }


    // Update node visibility based on the visibleNodeNames set
    radialSvg.selectAll('.node')
        .classed('filtered', d => {
             // A node is 'filtered' (hidden) if its name is NOT in the visibleNodeNames set
             // The root node is never fully hidden, only potentially faded by the overall SVG opacity.
            return d.data.nodeType !== 'root' && !visibleNodeNames.has(d.data.name);
        });

    // If no *brands* match the filter, show a message and fade the diagram.
    // We check filteredBrands.length which is the list of brands matching criteria.
    const noResultsMsg = document.querySelector('#radial-view .no-results');

    if (filteredBrands.length === 0) {
        if (!noResultsMsg) {
            const msg = document.createElement('div');
            msg.className = 'no-results';
            msg.innerHTML = `
                <h2>No brands found</h2>
                <p>Try adjusting your search criteria.</p>
            `;
            const radialViewDiv = document.getElementById('radial-view');
            if (radialViewDiv) {
                 radialViewDiv.appendChild(msg);
            }
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

     // Adjust opacity of links connected to filtered nodes
    radialSvg.selectAll('.link')
        .style('opacity', d => {
            // Check if both source and target nodes are in the set of visible nodes
             const sourceVisible = visibleNodeNames.has(d.source.data.name);
             const targetVisible = visibleNodeNames.has(d.target.data.name);
             return (sourceVisible && targetVisible) ? 1 : 0.1; // Fade out links to filtered nodes
        });

}


/**
 * Debounce function to limit how often a function can be called
 * @param {Function} func - The function to debounce
 * @param {number} wait - The debounce wait time in milliseconds
 * @returns {Function} - Debounced function
 */
function debounce(func, wait) {
    let timeout;
    return function(...args) { // Use rest parameters
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            func.apply(context, args); // Use spread operator
        }, wait);
    };
}


/**
 * Add or update the radial legend.
 * Note: This version uses text labels and colors based on categories.
 * It might need refinement to align with icon-based category nodes.
 */
function addRadialLegend() {
    // Remove any existing legend before adding
    d3.select('#radial-legend').html('');

    // Get unique categories that actually have brands assigned to them
    const categoriesWithBrands = Array.from(new Set(allBrands
        .filter(brand => brand.nodeType === 'brand' && brand.category) // Only consider brands with a category
        .map(b => b.category)
    ));

     // Define colors for categories (should match CSS or be consistent)
     // Ensure these match the colors used in styles.css or are generated consistently
    const colorMap = {
        'Coffee': '#8D6E63', // Brown
        'Sweets': '#EC407A', // Pink
        'Pet_Care': '#66BB6A', // Green
        'Water': '#29B6F6', // Light Blue
        'Beverages': '#FFA726', // Orange
        'Cereal': '#9C27B0', // Purple
        'Icecream': '#FFCDD2', // Light Pink
        'Cosmetics': '#FF8A65', // Light Orange
        'Fashion': '#BA68C8' // Different purple
        // Add colors for other categories if needed
    };

    const legend = d3.select('#radial-legend');
     if (legend.empty()) {
         console.error('Radial legend container not found.');
         return;
     }

    categoriesWithBrands.forEach(cat => {
        // Normalize category name for display in legend (e.g., Pet_Care -> Pet Care)
        const displayName = cat.replace(/_/g, ' ');

        legend.append('div')
            .attr('class', 'legend-row')
            .html(`
                <span class="legend-label" style="color: ${colorMap[cat] || '#888'};">${displayName}</span>
            `);
    });

     // Optional: Add specific legend items for L'Oréal parent and Nestlé root if desired
     // This might be useful to explain their visual representation.
}

// Helper function to project radial coordinates (angle, radius) to Cartesian (x, y)
// Assumes angle is in degrees (0-360) and radius is distance from origin (0,0)
function project(angle, radius) {
    const rad = (angle - 90) * Math.PI / 180; // Convert degrees to radians, adjust for 0 at the top
    return [radius * Math.cos(rad), radius * Math.sin(rad)]; // Return [x, y]
}
