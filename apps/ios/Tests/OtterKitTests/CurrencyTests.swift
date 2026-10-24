import Testing

@testable import OtterKit

struct CurrencyTests {
    @Test(arguments: Currency.allCases)
    func precisionMatchesCore(_ currency: Currency) throws {
        let expected = [Currency.twd, .jpy, .krw].contains(currency) ? 0 : 2
        #expect(currency.minorUnits == expected)
        #expect(try currency.parseAmount("12") == (expected == 0 ? 12 : 1200))
        #expect(try currency.parseAmount(" 0012 \n") == (expected == 0 ? 12 : 1200))
        #expect(try currency.parseAmount(currency.majorString(1250)) == 1250)
    }

    @Test func decimalAmountsAreExact() throws {
        #expect(try Currency.usd.parseAmount("0.29") == 29)
        #expect(try Currency.usd.parseAmount("12.5") == 1250)
        #expect(try Currency.usd.parseAmount("90071992547409.91") == 9_007_199_254_740_991)
        #expect(Currency.usd.majorString(-29) == "-0.29")
        #expect(Currency.usd.majorString(1200) == "12.00")
        #expect(Currency.twd.majorString(1250) == "1250")
        #expect(Currency.usd.majorString(Int64.min) == "-92233720368547758.08")
    }

    @Test(arguments: [
        "", "0", "-1", "+1", "1e2", "1,000", "1.", ".1", "1.001", "NaN", "１２", "1\n2",
        "9223372036854775808", "9223372036854775807", "90071992547409.92",
    ])
    func invalidDecimalAmounts(_ value: String) {
        #expect(throws: APIError.self) { try Currency.usd.parseAmount(value) }
    }

    @Test(arguments: [Currency.twd, .jpy, .krw])
    func integerCurrenciesRejectFractions(_ currency: Currency) {
        #expect(throws: APIError.self) { try currency.parseAmount("12.0") }
        #expect(throws: APIError.self) { try currency.parseAmount("0.01") }
    }
}
