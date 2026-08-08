// Currency display utilities — supports any ISO 4217 currency code.

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$", EUR: "€", GBP: "£", JPY: "¥", INR: "₹", CNY: "¥",
  CAD: "C$", AUD: "A$", CHF: "CHF", SGD: "S$", NZD: "NZ$",
  KRW: "₩", HKD: "HK$", AED: "د.إ", SEK: "kr", NOK: "kr",
  DKK: "kr", PLN: "zł", CZK: "Kč", HUF: "Ft", RON: "lei",
  TRY: "₺", RUB: "₽", UAH: "₴", ZAR: "R", BRL: "R$", MXN: "MX$",
  THB: "฿", IDR: "Rp", MYR: "RM", PHP: "₱", VND: "₫", TWD: "NT$",
  PKR: "₨", BDT: "৳", ILS: "₪", SAR: "﷼", EGP: "E£", NGN: "₦",
  ARS: "$", CLP: "$", COP: "$", PEN: "S/", KES: "KSh", LKR: "Rs",
  NPR: "रू", MAD: "د.م.", UZS: "so'm", KZT: "₸", GEL: "₾", BYN: "Br",
  AMD: "֏", AZN: "₼", IQD: "ع.د", TND: "د.ت", MUR: "₨", TTD: "TT$",
  JMD: "J$", XAF: "FCFA", XOF: "FCFA", XCD: "EC$", BWP: "P", ISK: "kr",
  CRC: "₡", DOP: "RD$", GTQ: "Q", HNL: "L", NIO: "C$", PAB: "B/.",
  UYU: "$U", PYG: "₲", BOB: "Bs", MOP: "MOP$", BND: "B$", FJD: "FJ$",
  MVR: "Rf", CVE: "Esc", WST: "WS$", TOP: "T$", SBD: "SI$", VUV: "VT",
  PGK: "K", MNT: "₮", KHR: "៛", LAK: "₭", MMK: "K", MGA: "Ar",
  GHS: "GH₵", ETB: "Br", UGX: "USh", TZS: "TSh", ZMW: "ZK", MZN: "MT",
  MWK: "MK", RWF: "FRw", BIF: "FBu", DJF: "Fdj", ERN: "Nfk", GNF: "FG",
  LRD: "L$", LYD: "LD", SCR: "₨", SOS: "S", SDG: "ج.س", SYP: "£S",
  YER: "﷼", KWD: "د.ك", BHD: "د.ب", OMR: "ر.ع.", JOD: "د.ا", QAR: "ر.ق",
  IRR: "﷼", LBP: "ل.ل", AFN: "؋", KPW: "₩", CUP: "₱", AWG: "ƒ",
  ANG: "ƒ", BBD: "Bds$", BZD: "BZ$", BSD: "B$", BMD: "BD$", KYD: "CI$",
};

/** All currency codes we offer in the picker (a broad world selection). */
export const CURRENCY_OPTIONS: Array<{ code: string; name: string }> = [
  { code: "USD", name: "US Dollar" },
  { code: "EUR", name: "Euro" },
  { code: "GBP", name: "British Pound" },
  { code: "JPY", name: "Japanese Yen" },
  { code: "INR", name: "Indian Rupee" },
  { code: "CNY", name: "Chinese Yuan" },
  { code: "AUD", name: "Australian Dollar" },
  { code: "CAD", name: "Canadian Dollar" },
  { code: "CHF", name: "Swiss Franc" },
  { code: "SGD", name: "Singapore Dollar" },
  { code: "NZD", name: "New Zealand Dollar" },
  { code: "KRW", name: "South Korean Won" },
  { code: "HKD", name: "Hong Kong Dollar" },
  { code: "AED", name: "UAE Dirham" },
  { code: "SAR", name: "Saudi Riyal" },
  { code: "QAR", name: "Qatari Riyal" },
  { code: "KWD", name: "Kuwaiti Dinar" },
  { code: "BHD", name: "Bahraini Dinar" },
  { code: "OMR", name: "Omani Rial" },
  { code: "JOD", name: "Jordanian Dinar" },
  { code: "SEK", name: "Swedish Krona" },
  { code: "NOK", name: "Norwegian Krone" },
  { code: "DKK", name: "Danish Krone" },
  { code: "PLN", name: "Polish Zloty" },
  { code: "CZK", name: "Czech Koruna" },
  { code: "HUF", name: "Hungarian Forint" },
  { code: "RON", name: "Romanian Leu" },
  { code: "BGN", name: "Bulgarian Lev" },
  { code: "TRY", name: "Turkish Lira" },
  { code: "RUB", name: "Russian Ruble" },
  { code: "UAH", name: "Ukrainian Hryvnia" },
  { code: "ILS", name: "Israeli Shekel" },
  { code: "ZAR", name: "South African Rand" },
  { code: "EGP", name: "Egyptian Pound" },
  { code: "MAD", name: "Moroccan Dirham" },
  { code: "NGN", name: "Nigerian Naira" },
  { code: "KES", name: "Kenyan Shilling" },
  { code: "GHS", name: "Ghanaian Cedi" },
  { code: "ETB", name: "Ethiopian Birr" },
  { code: "MXN", name: "Mexican Peso" },
  { code: "BRL", name: "Brazilian Real" },
  { code: "ARS", name: "Argentine Peso" },
  { code: "CLP", name: "Chilean Peso" },
  { code: "COP", name: "Colombian Peso" },
  { code: "PEN", name: "Peruvian Sol" },
  { code: "UYU", name: "Uruguayan Peso" },
  { code: "THB", name: "Thai Baht" },
  { code: "IDR", name: "Indonesian Rupiah" },
  { code: "MYR", name: "Malaysian Ringgit" },
  { code: "PHP", name: "Philippine Peso" },
  { code: "VND", name: "Vietnamese Dong" },
  { code: "TWD", name: "Taiwan Dollar" },
  { code: "PKR", name: "Pakistani Rupee" },
  { code: "BDT", name: "Bangladeshi Taka" },
  { code: "LKR", name: "Sri Lankan Rupee" },
  { code: "NPR", name: "Nepalese Rupee" },
  { code: "MMK", name: "Myanmar Kyat" },
  { code: "KHR", name: "Cambodian Riel" },
  { code: "LAK", name: "Lao Kip" },
  { code: "MNT", name: "Mongolian Tugrik" },
  { code: "UZS", name: "Uzbekistani Som" },
  { code: "KZT", name: "Kazakhstani Tenge" },
  { code: "AZN", name: "Azerbaijani Manat" },
  { code: "GEL", name: "Georgian Lari" },
  { code: "AMD", name: "Armenian Dram" },
  { code: "BYN", name: "Belarusian Ruble" },
  { code: "ISK", name: "Icelandic Krona" },
];

/** Get a display symbol for a currency code (falls back to the code itself). */
export function currencySymbol(code: string | undefined | null): string {
  if (!code) return "$";
  const c = code.trim().toUpperCase();
  return CURRENCY_SYMBOLS[c] || c;
}

/** Format an amount with the currency symbol, e.g. ₹ 1,250. */
export function formatCurrency(
  amount: number | null | undefined,
  code: string | undefined | null
): string {
  const num = amount ?? 0;
  const symbol = currencySymbol(code);
  const formatted = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: Math.abs(num) >= 1000 ? 0 : 2,
  }).format(num);
  return `${symbol} ${formatted}`;
}
