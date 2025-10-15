// Get a reference to the main form and all relevant elements
const emailForm = document.getElementById('email-form');
const csvUpload = document.getElementById('csv-upload');
const recipientsList = document.getElementById('recipients-list');
const manualEmail = document.getElementById('manual-email');
const manualFirstName = document.getElementById('manual-first-name');
const manualLastName = document.getElementById('manual-last-name');
const addRecipientBtn = document.getElementById('add-recipient-btn');
const subjectLine = document.getElementById('subject-line');
const messageInput = document.getElementById('message-input');
const statusDisplay = document.getElementById('status-display');
const csvDropZone = document.getElementById('csv-drop-zone');
const emailValidationMsg = document.getElementById('email-validation-msg');
const validationErrorsDisplay = document.getElementById('validation-errors');
const templateSelect = document.getElementById('template-select');
const progressBar = document.getElementById('progress-bar');
const progressText = document.getElementById('progress-text');
const progressContainer = document.getElementById('progress-container');

// This array will hold all of our recipient objects
let recipients = [];
let invalidRecipients = []; // New array to hold invalid recipients

// Define our pre-written email templates with personalization placeholders
const emailTemplates = {
    welcome: {
        subject: "Welcome to Our Platform!",
        message: "Hi! Welcome to our platform. We're excited to have you join our community and look forward to seeing what you'll create."
    },
    newsletter: {
        subject: "Monthly Newsletter: Your September Update",
        message: "Hello! Here is your monthly update. In this issue, we'll cover the latest news, features, and tips to help you get the most out of our service."
    },
    promotion: {
        subject: "Don't Miss Out! A Special Offer Just For You!",
        message: "Hi! We wanted to let you know about a special promotion for our valued users. Get 20% off your next purchase when you use the code: SPECIAL20."
    }
};

// Disable the Add button initially
addRecipientBtn.disabled = true;

// Listeners for the template select dropdown
templateSelect.addEventListener('change', (event) => {
    const templateName = event.target.value;
    if (templateName) {
        const template = emailTemplates[templateName];
        subjectLine.value = template.subject;
        messageInput.value = template.message;
    } else {
        // Clear the fields if "Select a template..." is chosen
        subjectLine.value = '';
        messageInput.value = '';
    }
});

// Listen for the 'input' or 'blur' event on the email field for real-time validation
manualEmail.addEventListener('blur', validateManualEmail);
manualEmail.addEventListener('input', validateManualEmail);


/**
 * Validates the email format for manual entry and updates the UI.
 */
function validateManualEmail() {
    const email = manualEmail.value.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (email === '') {
        emailValidationMsg.textContent = '';
        emailValidationMsg.className = 'validation-msg';
        addRecipientBtn.disabled = true;
    } else if (emailRegex.test(email)) {
        emailValidationMsg.textContent = 'Valid email.';
        emailValidationMsg.className = 'validation-msg valid';
        addRecipientBtn.disabled = false;
    } else {
        emailValidationMsg.textContent = 'Invalid email format.';
        emailValidationMsg.className = 'validation-msg invalid';
        addRecipientBtn.disabled = true;
    }
}

// Listeners for the drag-and-drop events
csvDropZone.addEventListener('dragover', (event) => {
    event.preventDefault(); // This is crucial to allow a drop
    csvDropZone.classList.add('drag-over');
});

csvDropZone.addEventListener('dragleave', () => {
    csvDropZone.classList.remove('drag-over');
});

csvDropZone.addEventListener('drop', (event) => {
    event.preventDefault(); // Prevent browser from opening the dropped file
    csvDropZone.classList.remove('drag-over');

    const file = event.dataTransfer.files[0];
    if (file && file.name.endsWith('.csv')) {
        handleFile(file);
    } else {
        alert('Please drop a valid CSV file.');
    }
});

// Listener for clicking the drop zone (as a fallback)
csvDropZone.addEventListener('click', () => {
    csvUpload.click();
});

// Listener for the hidden file input
csvUpload.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        handleFile(file);
    }
});

/**
 * Handles the file processing using Papa Parse.
 * @param {File} file - The file object to be processed.
 */
function handleFile(file) {
    recipients = [];
    invalidRecipients = []; // Clear previous errors
    
    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
            const newRecipients = processRecipients(results.data);
            recipients = [...newRecipients];
            recipients = removeDuplicates(recipients);
            renderRecipients();
            renderValidationErrors(); // Call the new function
        }
    });
}

// Listen for a click event on the "Add" button for manual entry
addRecipientBtn.addEventListener('click', function(event) {
    // Prevent the button from submitting a form
    event.preventDefault();

    const email = manualEmail.value.trim();
    const firstName = manualFirstName.value.trim();
    const lastName = manualLastName.value.trim();
    
    // We don't need to re-validate here because the button is disabled if invalid
    if (email) {
        const newRecipient = {
            email: email,
            first_name: firstName,
            last_name: lastName
        };

        // Add the new recipient to our main array
        recipients = [...recipients, newRecipient];

        // Re-run the de-duplication and rendering
        recipients = removeDuplicates(recipients);
        renderRecipients();

        // Clear the input fields for the next entry
        manualEmail.value = '';
        manualFirstName.value = '';
        manualLastName.value = '';
        
        // Disable button and clear message after successful add
        addRecipientBtn.disabled = true;
        emailValidationMsg.textContent = '';
    } else {
        // This case should not be reachable since the button is disabled
        alert('Please enter a valid email address.');
    }
});

// Add a submit event listener to the form
emailForm.addEventListener('submit', async function(event) {
    // Prevent the default form submission
    event.preventDefault();

    // Basic validation
    if (recipients.length === 0) {
        alert('Please add at least one recipient.');
        return;
    }
    if (!subjectLine.value.trim() || !messageInput.value.trim()) {
        alert('Please fill out the subject and message fields.');
        return;
    }

    // Show a sending status to the user and progress bar
    statusDisplay.innerHTML = '';
    progressContainer.style.display = 'block';

    let progress = 0;
    const interval = setInterval(() => {
        progress += 10;
        if (progress <= 100) {
            progressBar.style.width = progress + '%';
            progressText.textContent = progress + '%';
        }
    }, 200);

    // Prepare the data to be sent to the backend
    const campaignData = {
        subject: subjectLine.value,
        message: messageInput.value,
        recipients: recipients,
    };

    try {
        // Send the data to our Vercel serverless function
        const response = await fetch('/api/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(campaignData),
        });

        const result = await response.json();

        // Clear the progress interval after the response is received
        clearInterval(interval);
        progressBar.style.width = '100%';
        progressText.textContent = '100%';

        // Check for a successful response
        if (response.ok) {
            // Display the campaign metrics
            displayCampaignMetrics(result.metrics);
        } else {
            // Handle errors from the server
            statusDisplay.innerHTML = `<p class="status error">Error: ${result.message}</p>`;
        }
    } catch (error) {
        // Handle network errors
        console.error('Network error:', error);
        statusDisplay.innerHTML = '<p class="status error">A network error occurred. Please try again.</p>';
    }
});

/**
 * Validates and sanitizes recipient data from the CSV.
 * @param {Array<Object>} data - The parsed data from Papa Parse.
 * @returns {Array<Object>} The cleaned array of recipients.
 */
function processRecipients(data) {
    const validRecipients = [];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    data.forEach(row => {
        const email = row.email ? row.email.trim() : '';
        const firstName = row.first_name ? row.first_name.trim() : '';
        const lastName = row.last_name ? row.last_name.trim() : '';
        
        if (!email) {
            invalidRecipients.push({ ...row, reason: "Email address is missing." });
        } else if (!emailRegex.test(email)) {
            invalidRecipients.push({ ...row, reason: "Invalid email format." });
        } else {
            validRecipients.push({
                email: email,
                first_name: firstName,
                last_name: lastName
            });
        }
    });
    
    return validRecipients;
}

/**
 * Renders the invalid recipients on the page.
 */
function renderValidationErrors() {
    if (invalidRecipients.length > 0) {
        // Modified this line to include the count
        let errorHtml = `<h4>Invalid Entries (${invalidRecipients.length})</h4><ul>`;
        invalidRecipients.forEach(invalidItem => {
            const email = invalidItem.email ? invalidItem.email : '(missing)';
            const name = invalidItem.first_name ? invalidItem.first_name + ' ' + invalidItem.last_name : '';
            errorHtml += `
                <li>
                    <strong>Name:</strong> ${name || 'N/A'}<br>
                    <strong>Email:</strong> ${email || 'N/A'}<br>
                    <strong>Reason:</strong> ${invalidItem.reason}
                </li>
            `;
        });
        errorHtml += '</ul>';
        validationErrorsDisplay.innerHTML = errorHtml;
        validationErrorsDisplay.style.display = 'block';
    } else {
        validationErrorsDisplay.innerHTML = '';
        validationErrorsDisplay.style.display = 'none';
    }
}

/**
 * Removes duplicate recipients based on their email address.
 * @param {Array<Object>} list - The array of recipient objects.
 * @returns {Array<Object>} The array with duplicates removed.
 */
function removeDuplicates(list) {
    const seenEmails = new Set();
    return list.filter(item => {
        // Use a consistent key for checking duplicates
        const emailKey = item.email.toLowerCase(); 
        const isDuplicate = seenEmails.has(emailKey);
        seenEmails.add(emailKey);
        return !isDuplicate;
    });
}

/**
 * Renders the list of recipients on the page.
 */
function renderRecipients() {
    recipientsList.innerHTML = ''; // Clear the current list
    
    if (recipients.length === 0) {
        recipientsList.innerHTML = '<p>No recipients added yet.</p>';
        return;
    }

    recipients.forEach((recipient, index) => {
        const recipientItem = document.createElement('div');
        recipientItem.classList.add('recipient-item');
        // Add the fade-in class
        recipientItem.classList.add('fade-in');

        const nameSpan = document.createElement('span');
        nameSpan.innerHTML = `<strong>${recipient.first_name} ${recipient.last_name}</strong> <span class="email">${recipient.email}</span>`;
        
        // Create a remove button with the Font Awesome icon
        const removeButton = document.createElement('button');
        removeButton.classList.add('remove-btn');
        removeButton.innerHTML = `<i class="fas fa-trash-alt"></i>`;
        removeButton.onclick = () => removeRecipient(index);
        
        recipientItem.appendChild(nameSpan);
        recipientItem.appendChild(removeButton);
        recipientsList.appendChild(recipientItem);
    });
}

/**
 * Removes a recipient from the list by their index.
 * @param {number} index - The index of the recipient to remove.
 */
function removeRecipient(index) {
    recipients.splice(index, 1);
    renderRecipients(); // Re-render the list to reflect the change
}

/**
 * Displays the campaign metrics on the page.
 * @param {Object} metrics - The metrics object from the backend response.
 */
function displayCampaignMetrics(metrics) {
    statusDisplay.innerHTML = `
        <div class="dashboard-container">
            <div class="dashboard-header">
                <img src="/images/dashboard-logo.png" alt="Dashboard Logo" class="logo">
                <h2>DASHBOARD</h2>
            </div>
            <div class="metric-grid">
                <div class="metric-card">
                    <h3>TOTAL</h3>
                    <p class="number">${recipients.length}</p>
                </div>
                <div class="metric-card">
                    <h3>SENT</h3>
                    <p class="number">${metrics.sent_count}</p>
                </div>
                <div class="metric-card">
                    <h3>FAILED</h3>
                    <p class="number">${metrics.failed_count}</p>
                </div>
                <div class="metric-card">
                    <h3>OPENS</h3>
                    <p class="number">${metrics.opens_count}</p>
                </div>
            </div>
        </div>
    `;
    // Make sure you have a logo image named "dashboard-logo.png" in your /images folder
}

// Initial render to show "No recipients added yet."
renderRecipients();
