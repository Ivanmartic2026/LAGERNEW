import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const { article_id, article_name, current_stock, min_level, warehouse_email } = await req.json();

    if (!warehouse_email) {
      return Response.json({ error: 'warehouse_email required' }, { status: 400 });
    }

    // Skicka push-notis
    try {
      await base44.functions.invoke('sendPushNotification', {
        user_email: warehouse_email,
        title: 'Lågt lagersaldo',
        message: `${article_name} är nere på ${current_stock} st (min: ${min_level})`,
        type: 'low_stock',
        priority: 'high',
        link_page: '/Inventory',
        link_to: article_id
      });
    } catch (e) {
      console.error('Push notification failed:', e.message);
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});