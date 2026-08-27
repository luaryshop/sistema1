import { describe, expect, it } from "vitest";
import { routeWebhookEvent } from "./services/webhookEventRouter";

describe("webhook event router", () => {
  it("roteia pedido, pagamento, envio, cancelamento e devolução para reconciliação de pedidos", () => {
    for (const topic of ["order_created", "payment_approved", "shipment_updated", "order_cancelled", "return_requested"]) {
      expect(routeWebhookEvent(topic, {}).jobType).toBe("order");
    }
  });

  it("roteia estoque, preço e anúncio para os jobs correspondentes", () => {
    expect(routeWebhookEvent("inventory_updated", {}).jobType).toBe("stock");
    expect(routeWebhookEvent("price_updated", {}).jobType).toBe("price");
    expect(routeWebhookEvent("listing_updated", {}).jobType).toBe("stock");
  });

  it("não transforma evento desconhecido em atualização de estoque", () => {
    expect(routeWebhookEvent("account_notification", {}).jobType).toBeNull();
  });
});
