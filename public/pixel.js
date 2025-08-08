(function() {
  'use strict';
  
  // CRM Pixel Tracker
  const CRMPixel = {
    version: '1.0.0',
    config: {
      apiEndpoint: null,
      apiKey: null,
      debug: false,
      trackAllForms: true,
      formSelectors: ['form'],
      fieldMapping: {
        // Form 1: Instant Home Updates
        'email': ['email', 'best_email', 'best email', 'email_address', 'user_email', 'e-mail', 'emailaddress', 'contact_email'],
        'name': ['name', 'full_name', 'fullname', 'first_name', 'fname', 'your_name', 'contact_name'],
        'phone': ['phone', 'telephone', 'phone_number', 'mobile', 'tel', 'contact_phone', 'cellphone'],
        'areas_of_interest': ['area(s)_of_interest', 'areas_of_interest', 'area(s) of interest', 'areas of interest', 'area_of_interest'],
        'bedrooms': ['how_many_bedrooms?', 'how many bedrooms?', 'bedrooms', 'bedroom', 'beds'],
        'bathrooms': ['how_many_bathrooms?', 'how many bathrooms?', 'bathrooms', 'bathroom', 'baths'],
        'square_feet': ['how_much_square_feet?', 'how much square feet?', 'square_feet', 'square feet', 'sqft', 'sq_ft'],
        'acreage': ['acreage?', 'acreage', 'acres', 'lot_size'],
        'price': ['price?', 'price', 'price_range', 'budget'],
        'additional_criteria': ['any_other_criteria?', 'any other criteria?', 'additional_criteria', 'other_criteria', 'criteria', 'notes'],
        
        // Form 2: NWA Starter Pack
        'address': ['address', 'street_address', 'street', 'address_line_1'],
        'city': ['city', 'town'],
        'state': ['state', 'province'],
        'zipcode': ['zipcode', 'zip_code', 'zip', 'postal_code'],
        
        // General fields
        'company': ['company', 'organization', 'business_name', 'business', 'company_name'],
        'message': ['message', 'comments', 'notes', 'description', 'inquiry', 'details', 'comment']
      },
      excludeSelectors: [
        'form[action*="logout"]',
        'form[action*="search"]',
        'form.search-form',
        '#search-form'
      ]
    },
    
    // Initialize the pixel
    init: function() {
      if (this.config.debug) {
        console.log('[CRM Pixel] Initializing...', this.config);
      }
      
      // Wait for DOM to be ready
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.setupTracking());
      } else {
        this.setupTracking();
      }
      
      // Watch for dynamically added forms
      this.observeNewForms();
    },
    
    // Set configuration
    setConfig: function(newConfig) {
      Object.assign(this.config, newConfig);
      if (this.config.debug) {
        console.log('[CRM Pixel] Config updated:', this.config);
      }
      return this;
    },
    
    // Setup form tracking
    setupTracking: function() {
      const forms = this.findForms();
      if (this.config.debug) {
        console.log(`[CRM Pixel] Found ${forms.length} forms to track`);
      }
      forms.forEach(form => this.trackForm(form));
    },
    
    // Find forms to track
    findForms: function() {
      let forms = [];
      
      if (this.config.trackAllForms) {
        forms = Array.from(document.querySelectorAll('form'));
      } else {
        this.config.formSelectors.forEach(selector => {
          const foundForms = document.querySelectorAll(selector);
          forms = forms.concat(Array.from(foundForms));
        });
      }
      
      // Filter out excluded forms
      forms = forms.filter(form => {
        for (let excludeSelector of this.config.excludeSelectors) {
          if (form.matches(excludeSelector)) {
            if (this.config.debug) {
              console.log('[CRM Pixel] Excluding form:', form);
            }
            return false;
          }
        }
        return true;
      });
      
      return forms;
    },
    
    // Track a specific form
    trackForm: function(form) {
      // Check if already tracking
      if (form.dataset.crmPixelTracked === 'true') {
        return;
      }
      
      form.dataset.crmPixelTracked = 'true';
      
      // Add submit listener
      form.addEventListener('submit', (e) => {
        this.handleFormSubmit(e, form);
      });
      
      if (this.config.debug) {
        console.log('[CRM Pixel] Tracking form:', form);
      }
    },
    
    // Handle form submission
    handleFormSubmit: function(event, form) {
      if (this.config.debug) {
        console.log('[CRM Pixel] Form submission detected!');
      }
      
      try {
        const formData = this.extractFormData(form);
        
        if (this.config.debug) {
          console.log('[CRM Pixel] Form submitted, data extracted:', formData);
        }
        
        // Send data to CRM
        this.sendToCRM(formData);
        
      } catch (error) {
        if (this.config.debug) {
          console.error('[CRM Pixel] Error handling form submit:', error);
        }
      }
    },
    
    // Extract data from form
    extractFormData: function(form) {
      const formData = new FormData(form);
      const data = {};
      
      // Get all form fields
      const fields = {};
      for (let [key, value] of formData.entries()) {
        fields[key.toLowerCase()] = value;
      }
      
      // Map fields to standard names
      for (let [standardName, variations] of Object.entries(this.config.fieldMapping)) {
        for (let variation of variations) {
          if (fields[variation]) {
            data[standardName] = fields[variation];
            break;
          }
        }
      }
      
      // Add metadata
      data.source_url = window.location.href;
      data.referrer = document.referrer;
      data.timestamp = new Date().toISOString();
      data.user_agent = navigator.userAgent;
      
      // Include all raw fields as well
      data.raw_fields = fields;
      
      return data;
    },
    
    // Send data to CRM API
    sendToCRM: function(leadData) {
      if (!this.config.apiEndpoint) {
        if (this.config.debug) {
          console.error('[CRM Pixel] API endpoint not configured');
        }
        return;
      }
      
      if (!this.config.apiKey) {
        if (this.config.debug) {
          console.error('[CRM Pixel] API key not configured');
        }
        return;
      }
      
      const payload = {
        lead_data: leadData,
        source: 'website_form_pixel'
      };
      
      // Send async request (non-blocking)
      fetch(this.config.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.config.apiKey
        },
        body: JSON.stringify(payload),
        mode: 'cors'
      })
      .then(response => response.json())
      .then(data => {
        if (this.config.debug) {
          console.log('[CRM Pixel] Lead sent successfully:', data);
        }
        
        // Trigger custom event
        window.dispatchEvent(new CustomEvent('crmPixelLeadSent', {
          detail: { leadData, response: data }
        }));
      })
      .catch(error => {
        if (this.config.debug) {
          console.error('[CRM Pixel] Error sending lead:', error);
        }
        
        // Retry logic
        this.retryQueue = this.retryQueue || [];
        this.retryQueue.push({ payload, attempts: 0 });
        this.processRetryQueue();
      });
    },
    
    // Observe for new forms added to DOM
    observeNewForms: function() {
      if (!window.MutationObserver) return;
      
      // Ensure document.body exists before observing
      const startObserving = () => {
        if (!document.body) {
          setTimeout(startObserving, 100);
          return;
        }
        
        const observer = new MutationObserver((mutations) => {
          mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
              if (node && node.nodeType === 1) { // Element node
                if (node.tagName === 'FORM') {
                  this.trackForm(node);
                } else if (node.querySelector) {
                  const forms = node.querySelectorAll('form');
                  forms.forEach(form => this.trackForm(form));
                }
              }
            });
          });
        });
        
        observer.observe(document.body, {
          childList: true,
          subtree: true
        });
        
        if (this.config.debug) {
          console.log('[CRM Pixel] MutationObserver started');
        }
      };
      
      startObserving();
    },
    
    // Retry failed requests
    processRetryQueue: function() {
      if (!this.retryQueue || this.retryQueue.length === 0) return;
      
      setTimeout(() => {
        const item = this.retryQueue.shift();
        if (item && item.attempts < 3) {
          item.attempts++;
          
          fetch(this.config.apiEndpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-API-Key': this.config.apiKey
            },
            body: JSON.stringify(item.payload),
            mode: 'cors'
          })
          .then(response => response.json())
          .then(data => {
            if (this.config.debug) {
              console.log('[CRM Pixel] Retry successful:', data);
            }
          })
          .catch(error => {
            if (item.attempts < 3) {
              this.retryQueue.push(item);
            } else if (this.config.debug) {
              console.error('[CRM Pixel] Giving up after 3 attempts:', error);
            }
          });
        }
        
        // Process next item
        if (this.retryQueue.length > 0) {
          this.processRetryQueue();
        }
      }, 5000); // Retry after 5 seconds
    },
    
    // Utility function to test the pixel
    test: function() {
      const testData = {
        name: 'Test User',
        email: 'test@example.com',
        phone: '555-0123',
        company: 'Test Company',
        message: 'This is a test submission from CRM Pixel'
      };
      
      console.log('[CRM Pixel] Sending test data:', testData);
      this.sendToCRM(testData);
    }
  };
  
  // Expose to global scope
  window.CRMPixel = CRMPixel;
  
  // Auto-initialize if config is already set
  if (window.CRMPixelConfig) {
    CRMPixel.setConfig(window.CRMPixelConfig);
    CRMPixel.init();
  }
  
})();