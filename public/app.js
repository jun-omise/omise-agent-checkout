// App State
let currentSession = null;
let omisePublicKey = null;

// Sample cart data
const sampleCart = [
    {
        id: '1',
        name: 'Premium Headphones',
        description: 'Wireless noise-cancelling headphones',
        price: 499900, // 4999.00 THB in smallest unit
        quantity: 1
    },
    {
        id: '2',
        name: 'Smart Watch',
        description: 'Fitness tracking smartwatch',
        price: 899900, // 8999.00 THB
        quantity: 1
    },
    {
        id: '3',
        name: 'Wireless Charger',
        description: 'Fast wireless charging pad',
        price: 129900, // 1299.00 THB
        quantity: 1
    }
];

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    await loadConfig();
    displayCart();
    setupEventListeners();
});

// Load configuration
async function loadConfig() {
    try {
        const response = await fetch('/api/config');
        const config = await response.json();
        omisePublicKey = config.omisePublicKey;

        if (omisePublicKey && window.Omise) {
            window.Omise.setPublicKey(omisePublicKey);
        }
    } catch (error) {
        console.error('Failed to load configuration:', error);
    }
}

// Display cart items
function displayCart() {
    const cartItems = document.getElementById('cartItems');
    const cartTotal = document.getElementById('cartTotal');

    let total = 0;
    let html = '';

    sampleCart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;

        html += `
            <div class="cart-item">
                <div class="cart-item-info">
                    <h3>${item.name}</h3>
                    <p>${item.description}</p>
                </div>
                <div class="cart-item-price">
                    <div class="price">${formatAmount(itemTotal)} THB</div>
                    <div class="quantity">Qty: ${item.quantity}</div>
                </div>
            </div>
        `;
    });

    cartItems.innerHTML = html;
    cartTotal.textContent = `${formatAmount(total)} THB`;
}

// Format amount
function formatAmount(amount) {
    return (amount / 100).toFixed(2);
}

// Setup event listeners
function setupEventListeners() {
    const startCheckoutBtn = document.getElementById('startCheckoutBtn');
    const sendMessageBtn = document.getElementById('sendMessageBtn');
    const messageInput = document.getElementById('messageInput');

    startCheckoutBtn.addEventListener('click', startCheckout);
    sendMessageBtn.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
}

// Start checkout
async function startCheckout() {
    try {
        const response = await fetch('/api/checkout/session', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                cart: sampleCart,
                currency: 'THB'
            })
        });

        if (!response.ok) {
            throw new Error('Failed to create checkout session');
        }

        const session = await response.json();
        currentSession = session;

        // Update UI
        document.getElementById('cartSection').style.display = 'none';
        document.getElementById('checkoutSection').style.display = 'grid';
        document.getElementById('sessionId').textContent = session.sessionId;

        // Display order summary
        displayOrderSummary(session);

    } catch (error) {
        console.error('Error starting checkout:', error);
        alert('Failed to start checkout. Please try again.');
    }
}

// Display order summary
function displayOrderSummary(session) {
    const orderSummary = document.getElementById('orderSummary');
    const summaryTotal = document.getElementById('summaryTotal');

    let html = '';
    session.cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        html += `
            <div class="summary-item">
                <div class="summary-item-name">
                    ${item.name} (x${item.quantity})
                </div>
                <div class="summary-item-price">
                    ${formatAmount(itemTotal)} THB
                </div>
            </div>
        `;
    });

    orderSummary.innerHTML = html;
    summaryTotal.textContent = `${formatAmount(session.totalAmount)} ${session.currency}`;
}

// Send message to agent
async function sendMessage() {
    const messageInput = document.getElementById('messageInput');
    const message = messageInput.value.trim();

    if (!message || !currentSession) return;

    // Add user message to chat
    addMessageToChat('user', message);
    messageInput.value = '';

    // Disable input while processing
    const sendBtn = document.getElementById('sendMessageBtn');
    sendBtn.disabled = true;
    sendBtn.innerHTML = '<span class="loading"></span>';

    try {
        const response = await fetch('/api/checkout/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                sessionId: currentSession.sessionId,
                message: message
            })
        });

        if (!response.ok) {
            throw new Error('Failed to send message');
        }

        const data = await response.json();

        // Add assistant response to chat
        addMessageToChat('assistant', data.message);

    } catch (error) {
        console.error('Error sending message:', error);
        addMessageToChat('assistant', 'Sorry, I encountered an error. Please try again.');
    } finally {
        sendBtn.disabled = false;
        sendBtn.textContent = 'Send';
    }
}

// Add message to chat
function addMessageToChat(role, content) {
    const chatMessages = document.getElementById('chatMessages');

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';

    // Parse markdown-like formatting
    const formattedContent = formatMessageContent(content);
    contentDiv.innerHTML = formattedContent;

    messageDiv.appendChild(contentDiv);
    chatMessages.appendChild(messageDiv);

    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Format message content
function formatMessageContent(content) {
    // Convert newlines to <br>
    let formatted = content.replace(/\n/g, '<br>');

    // Convert URLs to links
    formatted = formatted.replace(
        /(https?:\/\/[^\s]+)/g,
        '<a href="$1" target="_blank" style="color: inherit; text-decoration: underline;">$1</a>'
    );

    // Wrap in paragraph if not already formatted
    if (!formatted.includes('<br>') && !formatted.includes('<p>')) {
        formatted = `<p>${formatted}</p>`;
    }

    return formatted;
}

// Test card payment (for development)
async function testCardPayment() {
    if (!window.Omise) {
        alert('Omise.js not loaded');
        return;
    }

    const cardData = {
        name: 'Test User',
        number: '4242424242424242',
        expiration_month: 12,
        expiration_year: 2025,
        security_code: '123'
    };

    window.Omise.createToken('card', cardData, async (statusCode, response) => {
        if (response.object === 'error') {
            console.error('Token creation failed:', response);
            return;
        }

        console.log('Token created:', response.id);

        // Send token to agent via chat
        const messageInput = document.getElementById('messageInput');
        messageInput.value = `I want to pay with credit card. Token: ${response.id}`;
        await sendMessage();
    });
}

// Expose test function for development
window.testCardPayment = testCardPayment;
