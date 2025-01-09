# Medusa Packeta (Zásilkovna) Fulfillment Plugin

This plugin integrates Packeta (Zásilkovna) shipping services with your MedusaJS store.

## Features

- Create shipments through Packeta API
- Cancel existing shipments
- Retrieve pickup points
- Support for cash on delivery (COD)
- Tracking number management

## Installation

```bash
npm install medusa-fulfillment-packeta
# or
yarn add medusa-fulfillment-packeta
```

## Configuration

### Environment Variables

Add the following variables to your `.env` file:

```bash
PACKETA_API_KEY=your_api_key_here
PACKETA_API_URL=https://api.packeta.com/v1
```

### Plugin Configuration

Add the plugin to your `medusa-config.js`:

```javascript
const plugins = [
  // ... other plugins
  {
    resolve: "medusa-fulfillment-packeta",
    options: {
      // Optional: Override environment variables
      api_key: process.env.PACKETA_API_KEY,
      api_url: process.env.PACKETA_API_URL,
    },
  },
]
```

## API Endpoints

### Get Pickup Points

Retrieve a list of all available Packeta pickup points.

```
GET /store/packeta/pickup-points
```

Response:
```json
{
  "pickup_points": [
    {
      "id": "string",
      "name": "string",
      "address": {
        "street": "string",
        "city": "string",
        "zip": "string",
        "country": "string"
      },
      // ... other pickup point details
    }
  ]
}
```

## Usage in Shipping Options

### Admin Configuration
When creating a shipping option in Medusa Admin:
1. Select "Packeta (Zásilkovna)" as the fulfillment provider
2. Configure pricing and other options as needed
3. When creating an order, the customer can select a pickup point

### Integrating the Map Widget
To integrate the Packeta pickup point selection widget in your storefront:

1. Add the Packeta Widget script to your HTML:
```html
<script src="https://widget.packeta.com/v6/www/js/library.js"></script>
```

2. Add a button or trigger to open the widget:
```html
<button onclick="openPacketaWidget()">Select Pickup Point</button>
```

3. Implement the widget initialization:
```javascript
function openPacketaWidget() {
  Packeta.Widget.pick(
    process.env.PACKETA_API_KEY, // Your API key
    function(pickupPoint) {
      // Handle the selected pickup point
      console.log('Selected pickup point:', pickupPoint);
      
      // Save the pickup point ID to your cart
      // Example: using Medusa's updateCart endpoint
      fetch('/store/carts/{cart_id}', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          shipping_data: {
            pickup_point_id: pickupPoint.id
          }
        })
      });
    },
    {
      // Optional widget configuration
      country: 'CZ', // Limit to specific country
      language: 'cs', // Widget language
      layout: 'desktop', // or 'mobile'
      width: '100%',
      height: '400px'
    }
  );
}
```

4. Style the widget container (optional):
```css
.packeta-widget-container {
  width: 100%;
  max-width: 800px;
  height: 600px;
  margin: 0 auto;
}
```

#### Widget Options
The widget supports various configuration options:

- `country`: Limit pickup points to specific country (e.g., 'CZ', 'SK')
- `language`: Widget interface language ('cs', 'en', etc.)
- `layout`: Display mode ('desktop' or 'mobile')
- `width`: Widget width (pixels or percentage)
- `height`: Widget height (pixels or percentage)
- `carriers`: Array of carrier IDs to show
- `defaultCarrier`: Pre-selected carrier
- `hideSettings`: Hide the settings panel
- `appIdentity`: Your application identifier

#### Selected Pickup Point Data
The widget callback receives detailed information about the selected pickup point:

```javascript
{
  id: "string",          // Pickup point ID
  name: "string",        // Name of the location
  city: "string",        // City
  street: "string",      // Street address
  zip: "string",         // ZIP code
  country: "string",     // Country code
  currency: "string",    // Currency for COD
  maxWeight: number,     // Maximum package weight
  openingHours: [...],   // Array of opening hours
  photos: [...],         // Array of location photos
  carrier: "string"      // Carrier identifier
}
```

#### Error Handling
Implement error handling for widget initialization:

```javascript
function openPacketaWidget() {
  try {
    Packeta.Widget.pick(/* ... */);
  } catch (error) {
    console.error('Failed to initialize Packeta widget:', error);
    // Show user-friendly error message
  }
}
```

## Development

### Build

```bash
npm run build
```

### Test

```bash
npm run test
```

## Future Improvements

- Generate shipping labels
- Track shipment status
- Support for return labels
- Additional pickup point filtering options

## License

MIT
