# Security Policy

## Supported Versions

We actively support the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly

## Response Process

1. We will acknowledge receipt within 48 hours
2. We will investigate and assess the vulnerability
3. We will provide regular updates on progress
4. We will release a fix as soon as possible
5. We will publicly acknowledge your contribution (unless you prefer anonymity)

## Security Features

This library includes several security features:

- Input validation for all public methods
- Secure logging (no sensitive data in logs)
- Safe DOM traversal and element selection
- Protection against injection attacks
- Configurable security thresholds

## Best Practices

When using this library:

- Keep dependencies up to date
- Use the latest stable version
- Follow secure coding practices
- Validate all user inputs
- Use HTTPS in production environments
- Regularly audit your dependencies

## Security Considerations

- This library operates within the browser context via Playwright
- Element selection is performed on the DOM tree
- No external network requests are made
- No sensitive data is stored or transmitted
