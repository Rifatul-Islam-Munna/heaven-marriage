import { sendGTMEvent } from "@next/third-parties/google";
export const pageViewEvent = (payload) => {
  return sendGTMEvent({
    event:"page_view", 
    event_id: payload.event_id,
    page_location: payload.url,
    page_title: payload.page_title,
  });
};

// In your GTM events file
export const viewContentEvent = (payload) => {
  return sendGTMEvent({
    event: "view_content",
    content_type: "biodata",
    item_id: payload.biodata_id,
    biodataNumber: payload.biodata_number,
    gender: payload.gender,
    age: payload.age,
    district: payload.district,
    education: payload.education,
    profession: payload.profession,
    name: payload.name
  });
};
