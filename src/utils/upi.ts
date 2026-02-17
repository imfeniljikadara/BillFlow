export const generateUPILink = (
    upiId: string,
    name: string,
    amount: number,
    note: string = 'Invoice Payment'
) => {
    // Basic UPI Link format
    // pa = Payee Address (UPI ID)
    // pn = Payee Name
    // am = Amount
    // cu = Currency (INR)
    // tn = Transaction Note
    const params = new URLSearchParams({
        pa: upiId,
        pn: name,
        am: amount.toString(),
        cu: 'INR',
        tn: note,
    });

    return `upi://pay?${params.toString()}`;
};
