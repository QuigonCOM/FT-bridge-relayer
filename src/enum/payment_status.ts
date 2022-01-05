export enum PaymentStatus {
    waiting = "waiting",
    confirming = "confirming",
    confirmed = "confirmed",
    sending = "sending",
    partially_paid = "partially_paid",
    finished = "finished",
    failed = "failed",
    refunded = "refunded",
    expired = "expired",
}