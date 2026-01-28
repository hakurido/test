# ETH NFT Mint Bot

CLI bot sederhana untuk otomasi mint NFT pada jaringan Ethereum. Bot akan mengeksekusi fungsi mint pada kontrak NFT sesuai waktu yang kamu tentukan.

## Fitur
- Input alamat kontrak NFT.
- Menentukan waktu mint (ISO atau unix timestamp).
- Mendukung fungsi mint kustom + argumen.
- Mendukung opsi gas + value (payable mint).

## Persiapan
1. Install dependensi:
   ```bash
   npm install
   ```
2. Siapkan file `.env`:
   ```bash
   RPC_URL=https://mainnet.infura.io/v3/xxxx
   PRIVATE_KEY=0xYOUR_PRIVATE_KEY
   ```

## Cara Pakai
```bash
node src/bot.js \
  --contract 0xYourNftContract \
  --mint-time 2025-01-01T12:00:00Z \
  --function "mint(uint256)" \
  --args '["1"]' \
  --value 0.05 \
  --max-fee 50 \
  --max-priority-fee 2
```

### Contoh dengan ABI
Jika fungsi mint tidak bisa diwakili hanya dengan signature, tambahkan file ABI:
```bash
node src/bot.js \
  --contract 0xYourNftContract \
  --mint-time 1735732800 \
  --function "mint" \
  --abi ./abi/Nft.json \
  --args '["1"]'
```

## Catatan Keamanan
- Simpan private key dengan aman dan jangan commit file `.env`.
- Pastikan mint time sudah benar (UTC) agar tidak terlambat.

## Dari mana mendapatkan file ABI?
Kamu bisa mendapatkan ABI dari:
- **Block explorer** (misalnya Etherscan) dengan membuka halaman kontrak, lalu bagian **Contract → ABI**.
- **Repository resmi proyek** (kadang file ABI disimpan di folder `abi/` atau `artifacts/`).
- **Build hasil compile** jika kamu punya source kontraknya (misal dari Hardhat/Foundry).
Simpan ABI sebagai file JSON dan gunakan path-nya dengan flag `--abi`.

## Lisensi
MIT
