# Ordinarinos Community App Store for Umbrel

This repository contains Ordinarinos for the Umbrel Community App Store.

## Adding this App Store to Umbrel

To add this app store to your Umbrel:

1. Go to the App Store section in your Umbrel dashboard
2. Click on "Add Community App Store"
3. Enter the URL of this repository: `https://github.com/ordinarinos/umbrel-community-app-store`
4. Click "Add App Store"

## Available Apps

### Ordinarinos Inscriptions

A sophisticated web-based Ordinals inscription platform that enables you to efficiently manage blockchain image uploads with precise fee calculation and optimization capabilities. Simplifies the process of transferring files to an Ordinals node and executing inscription commands through an intuitive web interface.

Features:
- Inscribe images, text, markdown, 3D models, BRC-20 tokens, and bitmap numbers
- Create recursive inscriptions that reference other inscriptions (HTML, SVG, CSS, custom formats)
- Rare sat selection for premium inscriptions
- Full Umbrel integration with Bitcoin Core and Ordinals services
- BRC-20 token operations (deploy, mint, transfer)
- Sats Names Service (SNS) integration for name registration

## Development

To develop and test the apps in this repository:

1. Clone this repository
2. Follow the [Umbrel Community App Store guidelines](https://github.com/getumbrel/umbrel-community-app-store)
3. Test your changes locally before submitting them

## License

This project is licensed under the [MIT License](LICENSE).

## Umbrel App Proxy Support

In Umbrel environments, the application now supports connecting through the Ord container directly or via the app proxy container:

- **Direct Connection**: The default mode connects directly to the `ordinals_ord_1` container
- **App Proxy Connection**: Alternative mode connects to the `ordinals_app_proxy_1` container which handles routing

### Using App Proxy

To enable app proxy mode:

1. Set the `USE_APP_PROXY` environment variable to `true`
2. The application will automatically connect on port 4000 instead of 80

This is particularly useful when:
- Direct access to the Ord container is restricted
- The standard Ord port (80) is blocked or unavailable
- The app-proxy provides additional features or security

### Automatic Detection

The application now automatically tries multiple container configurations:
1. First, it attempts the configured container name
2. If that fails, it tries alternative container names including `ordinals_ord_1`, `ordinals_app_proxy_1`, and others
3. For the app proxy, it will also try port 4000 which is commonly used

See `umbrel-debug.md` for more troubleshooting information.

