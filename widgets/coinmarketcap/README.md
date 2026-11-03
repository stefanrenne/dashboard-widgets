# CoinMarketCap

One row per cryptocurrency you list, with its price and its change over `defaultinterval` (1h,
24h, 7d or 30d), as homepage's coinmarketcap widget. List `symbols` (BTC, ETH) or, since symbols
are not unique, `slugs` (bitcoin, chia-network); slugs win. Get an API key on the
[CoinMarketCap Pro dashboard](https://pro.coinmarketcap.com/account).

Learn more about [CoinMarketCap](https://coinmarketcap.com/api/).

## Fields

No blocks: one row per currency.

## Example

```yaml
# services.yaml
- Finance:
    - Crypto:
        icon: coinmarketcap
        widget:
          type: coinmarketcap
          key: "{{DASHBOARD_VAR_CMC_KEY}}"
          symbols: [BTC, ETH, LTC]
          currency: EUR
          defaultinterval: 24h
```
