// Interior Lead Marketplace JavaScript
class InteriorLeadMarketplace {
    constructor() {
        this.currentUser = this.getCurrentUser();
        this.cart = this.getCart();
        this.init();
    }

    init() {
        this.setupNavigation();
        this.setupAuth();
        this.setupLeadsFunctionality();
        this.setupCart();
        this.setupAdminFeatures();
        this.loadRazorpayScript();
        console.log('Interior Lead Marketplace initialized successfully');
    }

    // Authentication functions
    getCurrentUser() {
        return JSON.parse(localStorage.getItem('currentUser') || 'null');
    }

    setCurrentUser(user) {
        localStorage.setItem('currentUser', JSON.stringify(user));
        this.currentUser = user;
    }

    clearCurrentUser() {
        localStorage.removeItem('currentUser');
        this.currentUser = null;
    }

    // Cart functions
    getCart() {
        return JSON.parse(localStorage.getItem('cart') || '[]');
    }

    setCart(cart) {
        localStorage.setItem('cart', JSON.stringify(cart));
        this.cart = cart;
        this.updateCartDisplay();
    }

    addToCart(lead) {
        const existingItem = this.cart.find(item => item.id === lead.id);
        if (!existingItem) {
            this.cart.push({
                id: lead.id,
                title: lead.title,
                location: lead.location,
                category: lead.category,
                price: 500
            });
            this.setCart(this.cart);
            this.showAlert('Lead added to cart!', 'success');
        } else {
            this.showAlert('Lead already in cart', 'warning');
        }
    }

    removeFromCart(leadId) {
        this.cart = this.cart.filter(item => item.id !== leadId);
        this.setCart(this.cart);
    }

    clearCart() {
        this.setCart([]);
    }

    updateCartDisplay() {
        const cartCount = document.querySelector('.cart-count');
        if (cartCount) {
            cartCount.textContent = this.cart.length;
            cartCount.style.display = this.cart.length > 0 ? 'flex' : 'none';
        }
    }

    // Navigation setup
    setupNavigation() {
        const currentPath = window.location.pathname;
        const navLinks = document.querySelectorAll('.nav-link');
        
        navLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href === currentPath || (currentPath === '/' && href === '/')) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });

        // Update login/logout button
        this.updateAuthButton();
    }

    updateAuthButton() {
        const authButton = document.querySelector('.nav-link.btn-primary');
        if (authButton) {
            if (this.currentUser) {
                authButton.textContent = 'Dashboard';
                authButton.href = '/dashboard';
            } else {
                authButton.textContent = 'Login';
                authButton.href = '/login';
            }
        }
    }

    // Authentication setup
    setupAuth() {
        const loginForm = document.getElementById('loginForm');
        const logoutBtn = document.getElementById('logoutBtn');

        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => this.handleLogout(e));
        }

        // Redirect if not logged in on protected pages
        const protectedPaths = ['/dashboard'];
        if (protectedPaths.includes(window.location.pathname) && !this.currentUser) {
            window.location.href = '/login';
        }
        
        if (window.location.pathname === '/dashboard') {
            this.loadDashboardData();
        }
        
        // Update navigation based on login status
        this.updateNavigation();
    }

    updateNavigation() {
        const navMenu = document.querySelector('.nav-menu');
        if (!navMenu) return;
        
        // Remove any existing auth elements first
        const existingCart = document.querySelector('.cart-icon');
        const existingLogin = navMenu.querySelector('a[href="/login"]');
        const existingRegister = navMenu.querySelector('a[href="/register"]');
        const existingLogout = navMenu.querySelector('a[href="#"]');
        
        if (existingCart) existingCart.remove();
        if (existingLogin) existingLogin.remove();
        if (existingRegister) existingRegister.remove();
        if (existingLogout && existingLogout.textContent === 'Logout') existingLogout.remove();
        
        if (this.currentUser) {
            // User is logged in - add cart and logout
            this.addCartToNavigationSimple();
        } else {
            // User is not logged in - add login/register
            const loginLink = document.createElement('a');
            loginLink.href = '/login';
            loginLink.className = 'nav-link';
            loginLink.textContent = 'Login';
            
            const registerLink = document.createElement('a');
            registerLink.href = '/register';
            registerLink.className = 'nav-link btn-primary';
            registerLink.textContent = 'Register';
            
            navMenu.appendChild(loginLink);
            navMenu.appendChild(registerLink);
        }
    }

    addCartToNavigationSimple() {
        const navMenu = document.querySelector('.nav-menu');
        if (navMenu && !document.querySelector('.cart-icon')) {
            const cartIcon = document.createElement('div');
            cartIcon.className = 'cart-icon nav-link';
            cartIcon.innerHTML = `
                🛒 Cart
                <span class="cart-count" style="display: none;">0</span>
            `;
            
            const logoutLink = document.createElement('a');
            logoutLink.href = '#';
            logoutLink.className = 'nav-link btn-secondary';
            logoutLink.textContent = 'Logout';
            logoutLink.onclick = (e) => {
                e.preventDefault();
                this.handleLogout();
            };
            
            navMenu.appendChild(cartIcon);
            navMenu.appendChild(logoutLink);
            this.updateCartDisplay();
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const username = formData.get('username');
        const password = formData.get('password');

        try {
            const response = await this.apiRequest('/api/auth/login', {
                method: 'POST',
                body: JSON.stringify({ username, password })
            });

            if (response.success) {
                this.setCurrentUser(response.user);
                this.showAlert('Login successful!', 'success');
                setTimeout(() => {
                    window.location.href = '/dashboard';
                }, 1000);
            } else {
                this.showAlert(response.message || 'Login failed', 'error');
            }
        } catch (error) {
            this.showAlert('Login failed. Please try again.', 'error');
        }
    }

    handleLogout() {
        this.clearCurrentUser();
        this.clearCart();
        this.updateNavigation();
        window.location.href = '/';
    }

    // Leads functionality
    setupLeadsFunctionality() {
        if (window.location.pathname === '/leads' || window.location.pathname === '/dashboard') {
            this.loadLeads();
        }

        // Setup lead action buttons
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('add-to-cart-btn')) {
                const leadId = e.target.dataset.leadId;
                const leadCard = e.target.closest('.lead-card');
                const lead = this.getLeadFromCard(leadCard);
                this.addToCart(lead);
            }
            if (e.target.classList.contains('purchase-lead-btn')) {
                this.handleLeadPurchase(e.target.dataset.leadId);
            }
        });
    }

    async loadLeads() {
        try {
            const response = await this.apiRequest('/api/leads');
            if (response.success) {
                this.displayLeads(response.leads);
            }
        } catch (error) {
            console.error('Failed to load leads:', error);
            this.showAlert('Failed to load leads', 'error');
        }
    }

    displayLeads(leads) {
        const leadsContainer = document.getElementById('leadsContainer');
        if (!leadsContainer) return;

        leadsContainer.innerHTML = leads.map(lead => `
            <div class="card lead-card" data-lead-id="${lead.id}">
                <div class="lead-header">
                    <h3>${lead.title}</h3>
                    <span class="lead-category">${lead.category}</span>
                </div>
                <div class="lead-info">
                    <p><strong>Location:</strong> ${lead.location}</p>
                    <p><strong>Budget:</strong> ${lead.budget}</p>
                    <p><strong>Timeline:</strong> ${lead.timeline}</p>
                    <p class="lead-description">${lead.description}</p>
                </div>
                <div class="lead-actions">
                    ${this.currentUser ? 
                        `<div style="display: flex; gap: 1rem; flex-wrap: wrap; justify-content: center;">
                            <button class="btn btn-secondary add-to-cart-btn" data-lead-id="${lead.id}">
                                Add to Cart
                            </button>
                            <button class="btn btn-primary purchase-lead-btn" data-lead-id="${lead.id}">
                                Buy Now - ₹500
                            </button>
                        </div>` :
                        `<a href="/login" class="btn btn-primary">Login to Purchase</a>`
                    }
                </div>
            </div>
        `).join('');
    }

    async handleLeadPurchase(leadId) {
        if (!this.currentUser) {
            window.location.href = '/login';
            return;
        }

        // Get lead data from the card
        const leadCard = document.querySelector(`[data-lead-id="${leadId}"]`);
        const lead = this.getLeadFromCard(leadCard);
        
        // Show payment modal for single item
        this.showPaymentModal([lead]);
    }

    async showPaymentModal(items) {
        // Calculate totals
        const subtotal = items.reduce((sum, item) => sum + item.price, 0);
        const gst = Math.round(subtotal * 0.18);
        const total = subtotal + gst;

        const modal = document.createElement('div');
        modal.className = 'payment-modal';
        modal.innerHTML = `
            <div class="payment-modal-content">
                <h3>Complete Payment</h3>
                <div class="payment-summary">
                    ${items.map(item => `
                        <div class="payment-item">
                            <span>${item.title}</span>
                            <span>₹${item.price}</span>
                        </div>
                    `).join('')}
                    <hr style="margin: 1rem 0;">
                    <div class="payment-item">
                        <span>Subtotal:</span>
                        <span>₹${subtotal}</span>
                    </div>
                    <div class="payment-item">
                        <span>GST (18%):</span>
                        <span>₹${gst}</span>
                    </div>
                    <div class="payment-item" style="font-weight: bold; font-size: 1.2rem;">
                        <span>Total:</span>
                        <span>₹${total}</span>
                    </div>
                </div>
                <div class="payment-actions">
                    <button class="btn btn-primary" onclick="window.app.processRazorpayPayment(${total}, ${JSON.stringify(items).replace(/"/g, '&quot;')})">
                        Pay with Razorpay
                    </button>
                    <button class="btn btn-secondary" onclick="this.parentElement.parentElement.parentElement.remove();">
                        Cancel
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    getLeadFromCard(leadCard) {
        return {
            id: leadCard.dataset.leadId,
            title: leadCard.querySelector('.lead-header h3').textContent,
            location: leadCard.querySelector('.lead-info p:first-child').textContent.replace('Location: ', ''),
            category: leadCard.querySelector('.lead-category').textContent,
            price: 500
        };
    }

    // Cart setup and functionality
    setupCart() {
        this.updateCartDisplay();
        
        // Add cart icon to navigation if user is logged in
        if (this.currentUser) {
            this.addCartToNavigation();
        }
        
        // Setup cart modal events
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('cart-icon') || e.target.closest('.cart-icon')) {
                this.showCartModal();
            }
            if (e.target.classList.contains('remove-from-cart')) {
                const leadId = e.target.dataset.leadId;
                this.removeFromCart(leadId);
            }
            if (e.target.id === 'proceedToCheckout') {
                this.proceedToCheckout();
            }
        });
    }

    addCartToNavigation() {
        if (this.currentUser) {
            this.addCartToNavigationSimple();
        }
    }

    showCartModal() {
        const modal = document.createElement('div');
        modal.className = 'cart-modal';
        modal.innerHTML = `
            <div class="cart-modal-content">
                <h3>Shopping Cart</h3>
                <div class="cart-items">
                    ${this.cart.length === 0 ? 
                        '<p>Your cart is empty</p>' :
                        this.cart.map(item => `
                            <div class="cart-item">
                                <div class="cart-item-info">
                                    <h4>${item.title}</h4>
                                    <p>${item.location} • ${item.category}</p>
                                </div>
                                <div>
                                    <div class="cart-item-price">₹${item.price}</div>
                                    <button class="remove-from-cart" data-lead-id="${item.id}">Remove</button>
                                </div>
                            </div>
                        `).join('')
                    }
                </div>
                ${this.cart.length > 0 ? `
                    <div class="cart-total">
                        <div class="cart-total-row">
                            <span>Subtotal:</span>
                            <span>₹${this.cart.reduce((sum, item) => sum + item.price, 0)}</span>
                        </div>
                        <div class="cart-total-row">
                            <span>GST (18%):</span>
                            <span>₹${Math.round(this.cart.reduce((sum, item) => sum + item.price, 0) * 0.18)}</span>
                        </div>
                        <div class="cart-total-row cart-total-final">
                            <span>Total:</span>
                            <span>₹${this.cart.reduce((sum, item) => sum + item.price, 0) + Math.round(this.cart.reduce((sum, item) => sum + item.price, 0) * 0.18)}</span>
                        </div>
                    </div>
                    <div style="display: flex; gap: 1rem; margin-top: 1.5rem;">
                        <button id="proceedToCheckout" class="btn btn-primary">Proceed to Checkout</button>
                        <button onclick="this.parentElement.parentElement.parentElement.remove()" class="btn btn-secondary">Close</button>
                    </div>
                ` : `
                    <button onclick="this.parentElement.parentElement.remove()" class="btn btn-secondary">Close</button>
                `}
            </div>
        `;
        document.body.appendChild(modal);
    }

    proceedToCheckout() {
        // Close cart modal
        document.querySelector('.cart-modal').remove();
        
        // Show checkout page
        this.showCheckoutPage();
    }

    showCheckoutPage() {
        const subtotal = this.cart.reduce((sum, item) => sum + item.price, 0);
        const gst = Math.round(subtotal * 0.18);
        const total = subtotal + gst;

        const modal = document.createElement('div');
        modal.className = 'payment-modal';
        modal.innerHTML = `
            <div class="payment-modal-content" style="max-width: 800px;">
                <h3>Checkout</h3>
                <div class="checkout-container" style="display: grid; grid-template-columns: 1fr 300px; gap: 2rem;">
                    <div class="checkout-items">
                        <h4>Items in your order</h4>
                        ${this.cart.map(item => `
                            <div class="checkout-item">
                                <div class="checkout-item-info">
                                    <h4>${item.title}</h4>
                                    <div class="checkout-item-details">${item.location} • ${item.category}</div>
                                </div>
                                <div class="checkout-item-price">₹${item.price}</div>
                            </div>
                        `).join('')}
                    </div>
                    <div class="checkout-summary">
                        <h4>Order Summary</h4>
                        <div class="summary-row">
                            <span>Subtotal:</span>
                            <span>₹${subtotal}</span>
                        </div>
                        <div class="summary-row">
                            <span>GST (18%):</span>
                            <span>₹${gst}</span>
                        </div>
                        <div class="summary-total">
                            <div class="summary-row">
                                <span>Total:</span>
                                <span>₹${total}</span>
                            </div>
                        </div>
                        <button onclick="window.app.processRazorpayPayment(${total}, ${JSON.stringify(this.cart).replace(/"/g, '&quot;')})" class="btn btn-primary" style="width: 100%; margin-top: 1rem;">
                            Pay with Razorpay
                        </button>
                        <button onclick="this.parentElement.parentElement.parentElement.remove()" class="btn btn-secondary" style="width: 100%; margin-top: 0.5rem;">
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    // Razorpay integration
    loadRazorpayScript() {
        if (!document.getElementById('razorpay-script')) {
            const script = document.createElement('script');
            script.id = 'razorpay-script';
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            document.head.appendChild(script);
        }
    }

    async processRazorpayPayment(amount, items) {
        if (!window.Razorpay) {
            this.showAlert('Payment system loading, please try again in a moment', 'warning');
            return;
        }

        const options = {
            key: 'rzp_test_1234567890', // Demo key - replace with actual key
            amount: amount * 100, // Amount in paise
            currency: 'INR',
            name: 'Interior Lead Marketplace',
            description: 'Lead Purchase',
            handler: (response) => {
                this.handlePaymentSuccess(response, items);
            },
            prefill: {
                name: this.currentUser.username,
                email: this.currentUser.email || '',
                contact: this.currentUser.phone || ''
            },
            theme: {
                color: '#271B10'
            }
        };

        const razorpay = new window.Razorpay(options);
        razorpay.open();
    }

    handlePaymentSuccess(paymentResponse, items) {
        // Close payment modal
        const modal = document.querySelector('.payment-modal');
        if (modal) modal.remove();

        // Add purchased leads to user's account
        this.addPurchasedLeads(items, paymentResponse);
        
        // Clear cart
        this.clearCart();
        
        // Show success message
        this.showAlert('Payment successful! Lead details are now available in your dashboard.', 'success');
        
        // Redirect to dashboard
        setTimeout(() => {
            window.location.href = '/dashboard';
        }, 2000);
    }

    addPurchasedLeads(items, paymentResponse) {
        let purchasedLeads = JSON.parse(localStorage.getItem('purchasedLeads') || '[]');
        
        items.forEach(item => {
            purchasedLeads.push({
                ...item,
                purchaseDate: new Date().toISOString(),
                paymentId: paymentResponse.razorpay_payment_id,
                contactDetails: {
                    name: 'John Smith', // Demo data
                    phone: '+91 9876543210',
                    email: 'john.smith@example.com'
                }
            });
        });
        
        localStorage.setItem('purchasedLeads', JSON.stringify(purchasedLeads));
    }

    // Admin features
    setupAdminFeatures() {
        if (this.currentUser && this.currentUser.role === 'admin') {
            this.addAdminUploadSection();
        }
    }

    addAdminUploadSection() {
        const dashboard = document.querySelector('.dashboard-content .container');
        if (dashboard && !document.querySelector('.admin-upload-section')) {
            const uploadSection = document.createElement('div');
            uploadSection.className = 'admin-upload-section';
            uploadSection.innerHTML = `
                <h3>Admin: Bulk Lead Upload</h3>
                <p>Upload Excel file with leads. Expected format: Name, Contact Number, Email ID, City, Project Type, Description</p>
                <div class="upload-area" onclick="document.getElementById('excelFile').click()">
                    <input type="file" id="excelFile" class="file-input" accept=".xlsx,.xls" />
                    <p>📁 Click to select Excel file or drag & drop here</p>
                </div>
                <div class="upload-progress" style="display: none;">
                    <div class="progress-bar" style="width: 0%"></div>
                </div>
                <div id="uploadStatus"></div>
            `;
            dashboard.appendChild(uploadSection);
            
            // Setup file upload handling
            this.setupFileUpload();
        }
    }

    setupFileUpload() {
        const fileInput = document.getElementById('excelFile');
        const uploadArea = document.querySelector('.upload-area');
        
        fileInput.addEventListener('change', (e) => {
            this.handleFileUpload(e.target.files[0]);
        });
        
        // Drag and drop functionality
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });
        
        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });
        
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            const file = e.dataTransfer.files[0];
            if (file) this.handleFileUpload(file);
        });
    }

    async handleFileUpload(file) {
        if (!file) return;
        
        const statusDiv = document.getElementById('uploadStatus');
        const progressDiv = document.querySelector('.upload-progress');
        const progressBar = document.querySelector('.progress-bar');
        
        statusDiv.innerHTML = '';
        progressDiv.style.display = 'block';
        progressBar.style.width = '0%';
        
        // Simulate file processing
        for (let i = 0; i <= 100; i += 10) {
            await new Promise(resolve => setTimeout(resolve, 100));
            progressBar.style.width = i + '%';
        }
        
        // Demo: Show success message
        statusDiv.innerHTML = `
            <div class="alert alert-success">
                Successfully uploaded ${file.name}! 
                Processed 5 leads and added them to the marketplace.
            </div>
        `;
        
        progressDiv.style.display = 'none';
        
        // In a real implementation, you would:
        // 1. Read the Excel file using a library like SheetJS
        // 2. Parse the data according to the template
        // 3. Send the data to your backend API
        // 4. Update the leads display
    }

    // Load purchased leads in dashboard
    loadPurchasedLeads() {
        const purchasedLeads = JSON.parse(localStorage.getItem('purchasedLeads') || '[]');
        const container = document.getElementById('purchasedLeadsContainer');
        
        if (container) {
            if (purchasedLeads.length === 0) {
                container.innerHTML = `
                    <div class="no-leads-message">
                        <p>You haven't purchased any leads yet.</p>
                        <a href="/leads" class="btn btn-primary">Browse Available Leads</a>
                    </div>
                `;
            } else {
                container.innerHTML = purchasedLeads.map(lead => `
                    <div class="card purchased-lead-card">
                        <h4>${lead.title}</h4>
                        <p><strong>Location:</strong> ${lead.location}</p>
                        <p><strong>Category:</strong> ${lead.category}</p>
                        <p><strong>Purchase Date:</strong> ${new Date(lead.purchaseDate).toLocaleDateString()}</p>
                        <div class="contact-details" style="background: var(--accent); padding: 1rem; border-radius: 8px; margin-top: 1rem;">
                            <h5>Contact Details:</h5>
                            <p><strong>Name:</strong> ${lead.contactDetails.name}</p>
                            <p><strong>Phone:</strong> ${lead.contactDetails.phone}</p>
                            <p><strong>Email:</strong> ${lead.contactDetails.email}</p>
                        </div>
                        <p style="margin-top: 1rem; color: var(--text-light); font-size: 0.875rem;">
                            Payment ID: ${lead.paymentId}
                        </p>
                    </div>
                `).join('');
            }
        }
    }

    // Dashboard functionality
    setupDashboard() {
        if (window.location.pathname === '/dashboard') {
            this.loadDashboardData();
        }
    }

    loadDashboardData() {
        const userInfo = document.getElementById('userInfo');
        if (userInfo && this.currentUser) {
            userInfo.innerHTML = `
                <h2>Welcome, ${this.currentUser.username}!</h2>
                <p>Role: ${this.currentUser.role}</p>
            `;
        }
        
        // Update dashboard stats
        this.updateDashboardStats();
        
        // Load purchased leads
        this.loadPurchasedLeads();
    }

    updateDashboardStats() {
        const purchasedLeads = JSON.parse(localStorage.getItem('purchasedLeads') || '[]');
        const cart = this.getCart();
        
        // Update stats
        const cartCountEl = document.getElementById('cartItemsCount');
        if (cartCountEl) cartCountEl.textContent = cart.length;
        
        const purchasedCountEl = document.getElementById('purchasedLeadsCount');
        if (purchasedCountEl) purchasedCountEl.textContent = purchasedLeads.length;
        
        // Update quick stats in dashboard
        const statElements = document.querySelectorAll('.stat-value');
        if (statElements.length >= 3) {
            statElements[0].textContent = purchasedLeads.length;
            statElements[1].textContent = `₹${purchasedLeads.length * 500}`;
        }
    }

    // Utility functions
    async apiRequest(url, options = {}) {
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
            },
        };

        const response = await fetch(url, { ...defaultOptions, ...options });
        return response.json();
    }

    showAlert(message, type = 'info') {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type}`;
        alertDiv.textContent = message;
        
        const container = document.querySelector('.container') || document.body;
        container.insertBefore(alertDiv, container.firstChild);
        
        setTimeout(() => {
            alertDiv.remove();
        }, 5000);
    }

    // Load statistics
    async loadStats() {
        try {
            // This would typically come from an API
            const stats = {
                activeDesigners: 500,
                leadsGenerated: 1000,
                citiesCovered: 50,
                satisfactionRate: 95
            };
            this.updateStatsDisplay(stats);
        } catch (error) {
            console.error('Failed to load stats:', error);
        }
    }

    updateStatsDisplay(stats) {
        const statNumbers = document.querySelectorAll('.stat-number');
        if (statNumbers.length > 0) {
            statNumbers[0].textContent = `${stats.activeDesigners}+`;
            statNumbers[1].textContent = `${stats.leadsGenerated}+`;
            statNumbers[2].textContent = `${stats.citiesCovered}+`;
            statNumbers[3].textContent = `${stats.satisfactionRate}%`;
        }
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    window.app = new InteriorLeadMarketplace();
});

// CSS for payment modal
const modalCSS = `
.payment-modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
}

.payment-modal-content {
    background: white;
    padding: 2rem;
    border-radius: 12px;
    max-width: 400px;
    width: 90%;
    text-align: center;
}

.payment-details {
    margin: 1.5rem 0;
    padding: 1rem;
    background: var(--background);
    border-radius: 8px;
}

.payment-actions {
    display: flex;
    gap: 1rem;
    justify-content: center;
    flex-wrap: wrap;
}
`;

// Add modal CSS to head
const style = document.createElement('style');
style.textContent = modalCSS;
document.head.appendChild(style);