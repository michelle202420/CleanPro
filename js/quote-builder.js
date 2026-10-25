// Quote Builder JavaScript
let serviceCounter = 0;
let services = [];

// Service options
const serviceOptions = [
    { name: 'Office Cleaning', defaultPrice: 10 },
    { name: 'Deep Cleaning', defaultPrice: 10 },
    { name: 'Window Cleaning', defaultPrice: 10 },
    { name: 'Host Checkout Cleaning Service', defaultPrice: 10 },
    { name: 'Floor Polishing', defaultPrice: 10 },
    { name: 'Restroom Sanitization', defaultPrice: 10 },
    { name: 'Kitchen Cleaning', defaultPrice: 10 },
    { name: 'Post-Construction Cleaning', defaultPrice: 10 },
    { name: 'Move-In/Move-Out Cleaning', defaultPrice: 10 },
    { name: 'Custom Service', defaultPrice: 10 }
];

document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    checkAuth();
    
    // Initialize
    initializeQuote();
    setupEventListeners();
    addServiceLine(); // Add first service line
    
    // Setup logout
    setupLogout();
});

function checkAuth() {
    const token = localStorage.getItem('adminToken');
    
    if (!token) {
        window.location.href = 'login.html';
        return;
    }
    
    fetch('/api/auth/verify', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Invalid token');
        }
        return response.json();
    })
    .then(data => {
        const currentUser = data.admin || data.user;
        if (currentUser && currentUser.username) {
            const adminNameEl = document.getElementById('adminName');
            if (adminNameEl) {
                adminNameEl.textContent = currentUser.username;
            }
        }
    })
    .catch(error => {
        console.error('Auth error:', error);
        localStorage.removeItem('adminToken');
        window.location.href = 'login.html';
    });
}

function setupLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async function(e) {
            e.preventDefault();
            const token = localStorage.getItem('adminToken');
            
            try {
                await fetch('/api/auth/logout', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
            } catch (error) {
                console.error('Logout error:', error);
            }
            
            localStorage.removeItem('adminToken');
            window.location.href = 'login.html';
        });
    }
}

function initializeQuote() {
    // Generate quote number
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    document.getElementById('quoteNumber').value = `QT-${dateStr}-${randomNum}`;
    
    // Set quote date to today
    const quoteDateInput = document.getElementById('quoteDate');
    quoteDateInput.value = today.toISOString().split('T')[0];
    
    // Calculate and set expiration date (30 days from today)
    updateExpirationDate();
}

function setupEventListeners() {
    // Add service button
    document.getElementById('addServiceBtn').addEventListener('click', addServiceLine);
    
    // Quote date change
    document.getElementById('quoteDate').addEventListener('change', updateExpirationDate);
    
    // VAT rate change
    document.getElementById('vatRate').addEventListener('input', calculateTotals);
    
    // Preview button
    document.getElementById('previewBtn').addEventListener('click', showPreview);
    
    // Export PDF button
    document.getElementById('exportPdfBtn').addEventListener('click', exportToPDF);
    
    // Modal close buttons
    document.getElementById('closePreview').addEventListener('click', closePreview);
    document.getElementById('closePreviewBtn').addEventListener('click', closePreview);
    document.getElementById('exportFromPreviewBtn').addEventListener('click', exportToPDF);
    
    // Close modal on outside click
    document.getElementById('previewModal').addEventListener('click', function(e) {
        if (e.target === this) {
            closePreview();
        }
    });
}

function updateExpirationDate() {
    const quoteDate = new Date(document.getElementById('quoteDate').value);
    const expirationDate = new Date(quoteDate);
    expirationDate.setDate(expirationDate.getDate() + 30);
    
    document.getElementById('expirationDate').value = expirationDate.toISOString().split('T')[0];
}

function addServiceLine() {
    serviceCounter++;
    const container = document.getElementById('servicesContainer');
    
    const serviceLine = document.createElement('div');
    serviceLine.className = 'service-line';
    serviceLine.dataset.serviceId = serviceCounter;
    
    serviceLine.innerHTML = `
        <div class="service-line-header">
            <span class="service-line-number">Service #${serviceCounter}</span>
            <button type="button" class="remove-service-btn" onclick="removeServiceLine(${serviceCounter})">Remove</button>
        </div>
        <div class="service-line-grid">
            <div class="form-group">
                <label>Service Name</label>
                <select class="service-name" onchange="updateServicePrice(${serviceCounter})">
                    <option value="">Select service...</option>
                    ${serviceOptions.map(s => `<option value="${s.name}" data-price="${s.defaultPrice}">${s.name}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>Description</label>
                <input type="text" class="service-description" placeholder="Service details...">
            </div>
            <div class="form-group">
                <label>Quantity</label>
                <input type="number" class="service-quantity" value="1" min="0" step="0.5" oninput="calculateLineTotal(${serviceCounter})">
            </div>
            <div class="form-group">
                <label>Unit</label>
                <select class="service-unit">
                    <option value="hours">Hours</option>
                    <option value="days">Days</option>
                    <option value="sqm">Sq. Meters</option>
                    <option value="units">Units</option>
                </select>
            </div>
            <div class="form-group">
                <label>Unit Price (€)</label>
                <input type="number" class="service-price" value="0" min="0" step="0.01" oninput="calculateLineTotal(${serviceCounter})">
            </div>
            <div class="form-group">
                <label>Line Total</label>
                <div class="line-total" id="lineTotal${serviceCounter}">€0.00</div>
            </div>
        </div>
    `;
    
    container.appendChild(serviceLine);
    
    // Initialize service object
    services.push({
        id: serviceCounter,
        name: '',
        description: '',
        quantity: 1,
        unit: 'hours',
        price: 0,
        total: 0
    });
}

function removeServiceLine(serviceId) {
    const serviceLine = document.querySelector(`[data-service-id="${serviceId}"]`);
    if (serviceLine) {
        serviceLine.remove();
        services = services.filter(s => s.id !== serviceId);
        calculateTotals();
    }
}

function updateServicePrice(serviceId) {
    const serviceLine = document.querySelector(`[data-service-id="${serviceId}"]`);
    const selectElement = serviceLine.querySelector('.service-name');
    const priceInput = serviceLine.querySelector('.service-price');
    
    const selectedOption = selectElement.options[selectElement.selectedIndex];
    const defaultPrice = selectedOption.dataset.price;
    
    if (defaultPrice) {
        priceInput.value = defaultPrice;
        calculateLineTotal(serviceId);
    }
}

function calculateLineTotal(serviceId) {
    const serviceLine = document.querySelector(`[data-service-id="${serviceId}"]`);
    const quantity = parseFloat(serviceLine.querySelector('.service-quantity').value) || 0;
    const price = parseFloat(serviceLine.querySelector('.service-price').value) || 0;
    const total = quantity * price;
    
    serviceLine.querySelector(`#lineTotal${serviceId}`).textContent = `€${total.toFixed(2)}`;
    
    // Update service object
    const service = services.find(s => s.id === serviceId);
    if (service) {
        service.name = serviceLine.querySelector('.service-name').value;
        service.description = serviceLine.querySelector('.service-description').value;
        service.quantity = quantity;
        service.unit = serviceLine.querySelector('.service-unit').value;
        service.price = price;
        service.total = total;
    }
    
    calculateTotals();
}

function calculateTotals() {
    // Calculate subtotal (prices already include VAT)
    const subtotal = services.reduce((sum, service) => sum + service.total, 0);
    
    // Get VAT rate
    const vatRate = parseFloat(document.getElementById('vatRate').value) || 0;
    
    // Calculate net amount (without VAT) and VAT amount
    // Formula: Net = Subtotal / (1 + VAT_rate/100)
    // VAT Amount = Subtotal - Net
    const netAmount = subtotal / (1 + (vatRate / 100));
    const vatAmount = subtotal - netAmount;
    
    // Grand total is the same as subtotal (since VAT is already included)
    const grandTotal = subtotal;
    
    // Update display
    document.getElementById('subtotal').textContent = `€${netAmount.toFixed(2)}`;
    document.getElementById('vatAmount').textContent = `€${vatAmount.toFixed(2)}`;
    document.getElementById('grandTotal').textContent = `€${grandTotal.toFixed(2)}`;
}

function getQuoteData() {
    // Collect all service data
    const serviceLines = document.querySelectorAll('.service-line');
    const servicesData = [];
    
    serviceLines.forEach(line => {
        const serviceId = parseInt(line.dataset.serviceId);
        servicesData.push({
            name: line.querySelector('.service-name').value,
            description: line.querySelector('.service-description').value,
            quantity: parseFloat(line.querySelector('.service-quantity').value) || 0,
            unit: line.querySelector('.service-unit').value,
            price: parseFloat(line.querySelector('.service-price').value) || 0,
            total: services.find(s => s.id === serviceId)?.total || 0
        });
    });
    
    // Calculate total (prices already include VAT)
    const total = servicesData.reduce((sum, s) => sum + s.total, 0);
    const vatRate = parseFloat(document.getElementById('vatRate').value) || 0;
    
    // Extract VAT from total
    const netAmount = total / (1 + (vatRate / 100));
    const vatAmount = total - netAmount;
    const grandTotal = total;
    
    return {
        quoteNumber: document.getElementById('quoteNumber').value,
        quoteDate: document.getElementById('quoteDate').value,
        expirationDate: document.getElementById('expirationDate').value,
        customer: {
            companyName: document.getElementById('companyName').value,
            contactPerson: document.getElementById('contactPerson').value,
            email: document.getElementById('customerEmail').value,
            phone: document.getElementById('customerPhone').value
        },
        salesRep: {
            name: document.getElementById('salesRepName').value,
            email: document.getElementById('salesRepEmail').value,
            phone: document.getElementById('salesRepPhone').value
        },
        services: servicesData,
        pricing: {
            subtotal: netAmount,
            vatRate,
            vatAmount,
            grandTotal
        },
        notes: {
            paymentTerms: document.getElementById('paymentTerms').value,
            validityNote: document.getElementById('validityNote').value,
            additionalComments: document.getElementById('additionalComments').value
        }
    };
}

function showPreview() {
    const data = getQuoteData();
    
    // Validate required fields
    if (!data.customer.companyName || !data.customer.contactPerson || !data.customer.email || !data.customer.phone) {
        alert('Please fill in all required customer information fields.');
        return;
    }
    
    if (!data.salesRep.name || !data.salesRep.email || !data.salesRep.phone) {
        alert('Please fill in all required sales representative information fields.');
        return;
    }
    
    if (data.services.length === 0 || data.services.every(s => !s.name)) {
        alert('Please add at least one service.');
        return;
    }
    
    const previewHtml = generatePreviewHTML(data);
    document.getElementById('quotePreview').innerHTML = previewHtml;
    document.getElementById('previewModal').style.display = 'flex';
}

function closePreview() {
    document.getElementById('previewModal').style.display = 'none';
}

function generatePreviewHTML(data) {
    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
    };
    
    return `
        <div class="preview-header">
            <div class="preview-company">
                <h1>🧹 CleanPro</h1>
                <p>Professional Cleaning Services</p>
                <p>Email: info@cleanpro.sk | Phone: +421 XXX XXX XXX</p>
            </div>
            <div class="preview-quote-info">
                <h2>QUOTE</h2>
                <p><strong>Quote #:</strong> ${data.quoteNumber}</p>
                <p><strong>Date:</strong> ${formatDate(data.quoteDate)}</p>
                <p><strong>Valid Until:</strong> ${formatDate(data.expirationDate)}</p>
            </div>
        </div>
        
        <div class="preview-customer">
            <h3>Bill To:</h3>
            <p><strong>${data.customer.companyName}</strong></p>
            <p>Attention: ${data.customer.contactPerson}</p>
            <p>Email: ${data.customer.email}</p>
            <p>Phone: ${data.customer.phone}</p>
        </div>
        
        <div class="preview-services">
            <h3>Services</h3>
            <table class="services-table">
                <thead>
                    <tr>
                        <th>Service</th>
                        <th>Description</th>
                        <th class="text-center">Qty</th>
                        <th class="text-center">Unit</th>
                        <th class="text-right">Unit Price</th>
                        <th class="text-right">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.services.filter(s => s.name).map(service => `
                        <tr>
                            <td><strong>${service.name}</strong></td>
                            <td>${service.description || '-'}</td>
                            <td class="text-center">${service.quantity}</td>
                            <td class="text-center">${service.unit}</td>
                            <td class="text-right">€${service.price.toFixed(2)}</td>
                            <td class="text-right"><strong>€${service.total.toFixed(2)}</strong></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        
        <div class="preview-totals">
            <div class="preview-totals-row hide-in-pdf">
                <span>Net Amount (excl. VAT):</span>
                <span>€${data.pricing.subtotal.toFixed(2)}</span>
            </div>
            <div class="preview-totals-row hide-in-pdf">
                <span>VAT (${data.pricing.vatRate}%):</span>
                <span>€${data.pricing.vatAmount.toFixed(2)}</span>
            </div>
            <div class="preview-totals-row total">
                <span>Total:</span>
                <span>€${data.pricing.grandTotal.toFixed(2)}</span>
            </div>
        </div>
        
        <div class="preview-notes">
            <h3>Terms & Conditions</h3>
            ${data.notes.paymentTerms ? `<p><strong>Payment Terms:</strong> ${data.notes.paymentTerms}</p>` : ''}
            ${data.notes.validityNote ? `<p><strong>Validity:</strong> ${data.notes.validityNote}</p>` : ''}
            ${data.notes.additionalComments ? `<p><strong>Additional Notes:</strong> ${data.notes.additionalComments}</p>` : ''}
        </div>
        
        <div class="preview-sales-rep">
            <h3>Your Sales Representative</h3>
            <p><strong>${data.salesRep.name}</strong></p>
            <p>Email: ${data.salesRep.email}</p>
            <p>Phone: ${data.salesRep.phone}</p>
            <p style="margin-top: 1.5rem; font-size: 0.9rem; color: #7f8c8d;">
                Thank you for considering CleanPro for your cleaning needs. We look forward to serving you!
            </p>
        </div>
    `;
}

async function exportToPDF() {
    const data = getQuoteData();
    
    // Validate required fields
    if (!data.customer.companyName || !data.customer.contactPerson) {
        alert('Please fill in all required customer information fields.');
        return;
    }
    
    // Show preview if not already shown
    if (document.getElementById('previewModal').style.display !== 'flex') {
        showPreview();
    }
    
    try {
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');
        
        const element = document.getElementById('quotePreview');
        
        // Hide VAT rows from preview before capturing
        const vatRows = element.querySelectorAll('.preview-totals-row:not(.total)');
        const vatRowsDisplay = [];
        vatRows.forEach((row, index) => {
            vatRowsDisplay[index] = row.style.display;
            row.style.display = 'none';
        });
        
        // Hide sales rep section temporarily
        const salesRepSection = element.querySelector('.preview-sales-rep');
        const originalDisplay = salesRepSection ? salesRepSection.style.display : '';
        if (salesRepSection) {
            salesRepSection.style.display = 'none';
        }
        
        // Capture main content (without sales rep section and without VAT details)
        const mainCanvas = await html2canvas(element, {
            scale: 2,
            useCORS: true,
            logging: false,
            windowHeight: element.scrollHeight,
            windowWidth: element.scrollWidth
        });
        
        // Show sales rep section and hide everything else
        if (salesRepSection) {
            salesRepSection.style.display = '';
            // Hide all other sections
            const allSections = element.querySelectorAll('.preview-header, .preview-customer, .preview-services, .preview-notes');
            allSections.forEach(section => {
                section.style.display = 'none';
            });
        }
        
        // Capture sales rep section only
        const salesRepCanvas = await html2canvas(element, {
            scale: 2,
            useCORS: true,
            logging: false,
            windowHeight: element.scrollHeight,
            windowWidth: element.scrollWidth
        });
        
        // Restore all sections
        if (salesRepSection) {
            const allSections = element.querySelectorAll('.preview-header, .preview-customer, .preview-services, .preview-notes');
            allSections.forEach(section => {
                section.style.display = '';
            });
        }
        
        // Restore VAT rows in preview
        vatRows.forEach((row, index) => {
            row.style.display = vatRowsDisplay[index];
        });
        
        // Add main content to PDF
        const imgWidth = 210; // A4 width in mm
        const pageHeight = 297; // A4 height in mm
        const mainImgHeight = (mainCanvas.height * imgWidth) / mainCanvas.width;
        
        let heightLeft = mainImgHeight;
        let position = 0;
        
        // Add first page with main content
        pdf.addImage(mainCanvas.toDataURL('image/png'), 'PNG', 0, position, imgWidth, mainImgHeight);
        heightLeft -= pageHeight;
        
        // Add additional pages for main content if needed
        while (heightLeft > 0) {
            position = heightLeft - mainImgHeight;
            pdf.addPage();
            pdf.addImage(mainCanvas.toDataURL('image/png'), 'PNG', 0, position, imgWidth, mainImgHeight);
            heightLeft -= pageHeight;
        }
        
        // Add new page for sales rep section
        pdf.addPage();
        const salesRepImgHeight = (salesRepCanvas.height * imgWidth) / salesRepCanvas.width;
        pdf.addImage(salesRepCanvas.toDataURL('image/png'), 'PNG', 0, 0, imgWidth, salesRepImgHeight);
        
        pdf.save(`Quote_${data.quoteNumber}.pdf`);
        
        alert('PDF exported successfully!');
    } catch (error) {
        console.error('PDF export error:', error);
        alert('Failed to export PDF. Please try again.');
    }
}

// Made with Bob
