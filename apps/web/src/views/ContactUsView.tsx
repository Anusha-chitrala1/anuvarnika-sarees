import React from 'react';
import { motion } from 'framer-motion';
import { Mail, Instagram, MapPin, Clock } from 'lucide-react';
import { WhatsAppIcon } from '../components/WhatsAppFloat.js';

export const ContactUsView: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-12">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-3 max-w-2xl mx-auto"
      >
        <span className="text-xs uppercase font-bold tracking-[0.2em] text-accent">
          We Would Love To Hear From You
        </span>
        <h1 className="font-serif text-4xl sm:text-5xl font-semibold text-primary">
          Contact AnuVarnika Sarees
        </h1>
        <p className="text-base text-ink-muted font-light">
          Have questions about a saree, colour shade, bulk bridal orders, or delivery in Andhra Pradesh & Telangana? Reach out directly!
        </p>
      </motion.div>

      {/* Direct Contact Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* WhatsApp */}
        <motion.a
          href="https://wa.me/917013622760?text=Hi%20AnuVarnika%20Sarees!%20I%20have%20an%20inquiry."
          target="_blank"
          rel="noreferrer"
          whileHover={{ y: -4 }}
          className="p-6 rounded-2xl bg-surface border border-accent/25 hover:border-[#25D366] shadow-xs hover:shadow-lg transition-all space-y-3 block"
        >
          <div className="w-12 h-12 rounded-xl bg-[#25D366]/15 text-[#1EBE5D] flex items-center justify-center">
            <WhatsAppIcon className="w-6 h-6" />
          </div>
          <h3 className="font-serif text-xl font-semibold text-primary">WhatsApp</h3>
          <p className="text-sm font-semibold text-ink-primary">+91 70136 22760</p>
          <p className="text-xs text-ink-muted">
            Tap to message us directly for saree photos, video calls, or order help.
          </p>
        </motion.a>

        {/* Instagram */}
        <motion.a
          href="https://www.instagram.com/anuvarnika_sarees/"
          target="_blank"
          rel="noreferrer"
          whileHover={{ y: -4 }}
          className="p-6 rounded-2xl bg-surface border border-accent/25 hover:border-primary shadow-xs hover:shadow-lg transition-all space-y-3 block"
        >
          <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Instagram className="w-6 h-6" />
          </div>
          <h3 className="font-serif text-xl font-semibold text-primary">Instagram</h3>
          <p className="text-sm font-semibold text-ink-primary">@anuvarnika_sarees</p>
          <p className="text-xs text-ink-muted">
            Follow us for new arrivals, drape reels, and festive saree styling.
          </p>
        </motion.a>

        {/* Email */}
        <motion.a
          href="mailto:anuvarnika.sarees@gmail.com"
          whileHover={{ y: -4 }}
          className="p-6 rounded-2xl bg-surface border border-accent/25 hover:border-primary shadow-xs hover:shadow-lg transition-all space-y-3 block"
        >
          <div className="w-12 h-12 rounded-xl bg-accent/15 text-accent flex items-center justify-center">
            <Mail className="w-6 h-6" />
          </div>
          <h3 className="font-serif text-xl font-semibold text-primary">Email</h3>
          <p className="text-sm font-semibold text-ink-primary break-all">
            anuvarnika.sarees@gmail.com
          </p>
          <p className="text-xs text-ink-muted">
            Write to us for order support, payment queries, or collaborations.
          </p>
        </motion.a>
      </div>

      {/* Service Area & Hours */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl bg-surface border border-accent/25 flex items-start gap-4">
          <MapPin className="w-6 h-6 text-primary shrink-0 mt-0.5" />
          <div>
            <h4 className="font-serif text-lg font-semibold text-primary">Serviceable States</h4>
            <p className="text-sm text-ink-muted mt-1">
              Currently delivering across <strong>Andhra Pradesh</strong> & <strong>Telangana</strong> (PIN codes starting with 50, 51, 52, 53).
            </p>
          </div>
        </div>
        <div className="p-6 rounded-2xl bg-surface border border-accent/25 flex items-start gap-4">
          <Clock className="w-6 h-6 text-accent shrink-0 mt-0.5" />
          <div>
            <h4 className="font-serif text-lg font-semibold text-primary">Support Hours</h4>
            <p className="text-sm text-ink-muted mt-1">
              Monday – Saturday, 10:00 AM – 7:00 PM IST
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
