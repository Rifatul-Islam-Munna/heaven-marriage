import { sendGTMEvent } from "@next/third-parties/google";
export const pageViewEvent = (payload) => {
  return sendGTMEvent({
    event:"page_view", 
    event_id: payload.event_id,
    page_location: payload.url,
    page_title: payload.page_title,
  });
};