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

When creating a shipping option in Medusa Admin:
1. Select "Packeta (Zásilkovna)" as the fulfillment provider
2. Configure pricing and other options as needed
3. When creating an order, the customer can select a pickup point

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
