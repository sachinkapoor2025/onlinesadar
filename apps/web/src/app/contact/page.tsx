import type { Metadata } from "next";
import { site } from "@/lib/site";
import { pageMetadata, contactPageJsonLd } from "@/lib/seo";
import { JsonLd } from "@/components/JsonLd";
import { ContactForm } from "./ContactForm";

export const metadata: Metadata = pageMetadata({
  title: "Contact Us — Rakhi Delivery Support",
  description: `Contact ${site.name} for Rakhi delivery support, order help, and Raksha Bandhan inquiries. ${site.supportEmail}`,
  path: "/contact",
});

export default function ContactPage() {
  return (
    <>
      <JsonLd data={contactPageJsonLd()} />
      <ContactForm />
    </>
  );
}
