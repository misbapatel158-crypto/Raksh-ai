import React, { useState, useEffect } from "react";
import {
  Shield,
  Phone,
  Plus,
  Trash2,
  Star,
  Edit2,
  Check,
  X,
  User as UserIcon,
  PhoneCall,
  Loader2,
  Save,
  CheckCircle2,
} from "lucide-react";
import { api } from "../services/api";
import { User, EmergencyContact } from "../types";
import { useTranslation } from "../i18n";

interface ContactsManagerProps {
  user: User | null;
  onOpenAuth: () => void;
  onUserUpdated: (user: User) => void;
}

export const ContactsManager: React.FC<ContactsManagerProps> = ({
  user,
  onOpenAuth,
  onUserUpdated,
}) => {
  const { t } = useTranslation();
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [loading, setLoading] = useState(false);

  // My Personal Phone Number Edit State
  const [editingMyPhone, setEditingMyPhone] = useState(false);
  const [myPhone, setMyPhone] = useState(user?.phoneNumber || "");
  const [myCountryCode, setMyCountryCode] = useState(user?.countryCode || "+91");
  const [savingMyPhone, setSavingMyPhone] = useState(false);
  const [myPhoneMessage, setMyPhoneMessage] = useState<string | null>(null);

  // Add Contact Form State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newRelationship, setNewRelationship] = useState("Family");
  const [newPhone, setNewPhone] = useState("");
  const [newIsPrimary, setNewIsPrimary] = useState(false);
  const [savingContact, setSavingContact] = useState(false);

  // Edit Contact Form State
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editRelationship, setEditRelationship] = useState("");
  const [editPhone, setEditPhone] = useState("");


  const fetchContacts = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await api.getContacts();
      if (res.success && res.data?.contacts) {
        setContacts(res.data.contacts);
      }
    } catch (err) {
      console.error("Failed to load contacts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchContacts();
      setMyPhone(user.phoneNumber || "");
      setMyCountryCode(user.countryCode || "+1");
    }
  }, [user]);

  // Save / Update My Emergency Contact Number
  const handleSaveMyPhoneNumber = async () => {
    if (!user) return;
    setSavingMyPhone(true);
    setMyPhoneMessage(null);
    try {
      const res = await api.updateProfile({
        phoneNumber: myPhone.trim() || null,
        countryCode: myCountryCode.trim() || "+1",
      });

      if (res.success && res.data?.user) {
        onUserUpdated(res.data.user);
        setEditingMyPhone(false);
        setMyPhoneMessage("Your emergency contact number was saved securely.");
        setTimeout(() => setMyPhoneMessage(null), 3000);
      }
    } catch (err) {
      console.error("Failed to update my phone number:", err);
    } finally {
      setSavingMyPhone(false);
    }
  };

  const handleDeleteMyPhoneNumber = async () => {
    if (!user) return;
    setSavingMyPhone(true);
    try {
      const res = await api.updateProfile({
        phoneNumber: null,
      });

      if (res.success && res.data?.user) {
        setMyPhone("");
        onUserUpdated(res.data.user);
        setEditingMyPhone(false);
        setMyPhoneMessage("Emergency contact number removed.");
        setTimeout(() => setMyPhoneMessage(null), 3000);
      }
    } catch (err) {
      console.error("Failed to delete phone number:", err);
    } finally {
      setSavingMyPhone(false);
    }
  };

  // Add Contact
  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPhone.trim()) return;

    setSavingContact(true);
    try {
      const res = await api.createContact({
        name: newName.trim(),
        relationship: newRelationship.trim(),
        phone: newPhone.trim(),
        isPrimary: newIsPrimary,
      });

      if (res.success && res.data?.contact) {
        setContacts((prev) => [res.data.contact, ...prev]);
        setShowAddModal(false);
        setNewName("");
        setNewPhone("");
        setNewRelationship("Family");
        setNewIsPrimary(false);
        fetchContacts();
      }
    } catch (err) {
      console.error("Failed to add contact:", err);
    } finally {
      setSavingContact(false);
    }
  };

  // Delete Contact
  const handleDeleteContact = async (contactId: string) => {
    if (!window.confirm("Delete this emergency contact?")) return;
    try {
      const res = await api.deleteContact(contactId);
      if (res.success) {
        setContacts((prev) => prev.filter((c) => c.id !== contactId));
      }
    } catch (err) {
      console.error("Failed to delete contact:", err);
    }
  };

  // Set Primary
  const handleSetPrimary = async (contactId: string) => {
    try {
      const res = await api.setPrimaryContact(contactId);
      if (res.success) {
        setContacts((prev) =>
          prev.map((c) => ({
            ...c,
            isPrimary: c.id === contactId,
          }))
        );
      }
    } catch (err) {
      console.error("Failed to set primary:", err);
    }
  };

  // Start Editing Contact
  const handleStartEditContact = (contact: EmergencyContact) => {
    setEditingContactId(contact.id);
    setEditName(contact.name);
    setEditRelationship(contact.relationship);
    setEditPhone(contact.phone);
  };

  // Save Edited Contact
  const handleSaveEditContact = async (contactId: string) => {
    try {
      const res = await api.updateContact(contactId, {
        name: editName.trim(),
        relationship: editRelationship.trim(),
        phone: editPhone.trim(),
      });

      if (res.success && res.data?.contact) {
        setContacts((prev) =>
          prev.map((c) => (c.id === contactId ? res.data.contact : c))
        );
        setEditingContactId(null);
      }
    } catch (err) {
      console.error("Failed to edit contact:", err);
    }
  };

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center bg-white border border-[#E4E4E7] rounded-2xl p-8 space-y-4 shadow-sm">
        <div className="w-12 h-12 rounded-2xl bg-[#F4F4F5] text-[#71717A] flex items-center justify-center mx-auto border border-[#E4E4E7]">
          <Shield className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-[#18181B]">{t("contacts.signInPrompt")}</h3>
        <p className="text-xs text-[#71717A] max-w-md mx-auto">
          {t("contacts.signInDesc")}
        </p>
        <button
          onClick={onOpenAuth}
          className="px-5 py-2.5 bg-[#18181B] hover:bg-zinc-800 text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
        >
          {t("auth.signIn")} / {t("auth.createAccount")}
        </button>
      </div>
    );
  }

  return (
    <div id="contacts-manager-container" className="max-w-4xl mx-auto space-y-6">
      {/* 1. My Emergency Contact Number (Settings Card) */}
      <div
        id="card-my-emergency-phone"
        className="bg-white border border-[#E4E4E7] rounded-2xl p-5 sm:p-6 space-y-4 shadow-sm"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E4E4E7] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center">
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#18181B]">
                {t("contacts.myPhoneTitle")}
              </h3>
              <p className="text-xs text-[#71717A]">
                {t("contacts.myPhoneDesc")}
              </p>
            </div>
          </div>

          {!editingMyPhone && (
            <div className="flex items-center gap-2">
              <button
                id="btn-edit-my-phone"
                onClick={() => setEditingMyPhone(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F4F4F5] hover:bg-[#E4E4E7] text-[#18181B] rounded-xl text-xs font-bold border border-[#E4E4E7] transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>{t("common.edit")}</span>
              </button>
              {user.phoneNumber && (
                <button
                  id="btn-delete-my-phone"
                  onClick={handleDeleteMyPhoneNumber}
                  disabled={savingMyPhone}
                  className="p-1.5 text-[#71717A] hover:text-[#EF4444] rounded-lg hover:bg-[#F4F4F5] transition-colors"
                  title="Delete stored phone number"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>

        {myPhoneMessage && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{myPhoneMessage}</span>
          </div>
        )}

        {editingMyPhone ? (
          <div className="space-y-4 pt-1">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1">
                <label className="block text-[10px] uppercase font-bold text-[#71717A] mb-1">
                  {t("contacts.code")}
                </label>
                <input
                  id="input-my-country-code"
                  type="text"
                  placeholder="+91"
                  value={myCountryCode}
                  onChange={(e) => setMyCountryCode(e.target.value)}
                  className="w-full bg-[#F4F4F5] border border-[#E4E4E7] rounded-xl px-3 py-2 text-xs sm:text-sm text-[#18181B] font-bold focus:bg-white focus:outline-none focus:border-[#18181B]"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] uppercase font-bold text-[#71717A] mb-1">
                  {t("contacts.phone")}
                </label>
                <input
                  id="input-my-phone"
                  type="tel"
                  placeholder="e.g. 9876543210"
                  value={myPhone}
                  onChange={(e) => setMyPhone(e.target.value)}
                  className="w-full bg-[#F4F4F5] border border-[#E4E4E7] rounded-xl px-3.5 py-2 text-xs sm:text-sm text-[#18181B] font-bold focus:bg-white focus:outline-none focus:border-[#18181B]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditingMyPhone(false);
                  setMyPhone(user.phoneNumber || "");
                }}
                className="px-3.5 py-1.5 text-xs font-bold text-[#71717A] hover:text-[#18181B] rounded-lg hover:bg-[#F4F4F5]"
              >
                {t("common.cancel")}
              </button>
              <button
                id="btn-save-my-phone"
                type="button"
                disabled={savingMyPhone}
                onClick={handleSaveMyPhoneNumber}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#18181B] hover:bg-zinc-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-sm transition-colors"
              >
                {savingMyPhone ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>{t("common.save")}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between p-3.5 bg-[#F4F4F5] border border-[#E4E4E7] rounded-xl">
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-bold text-[#71717A]">{t("contacts.registeredPhone")}:</span>
              <span className="text-sm font-bold font-mono text-[#18181B]">
                {user.phoneNumber ? `${user.countryCode || "+91"} ${user.phoneNumber}` : t("contacts.noPhoneRegistered")}
              </span>
            </div>
            {user.phoneNumber && (
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                {t("contacts.verifiedAlerts")}
              </span>
            )}
          </div>
        )}
      </div>

      {/* 2. Emergency Contacts List */}
      <div
        id="card-emergency-contacts-list"
        className="bg-white border border-[#E4E4E7] rounded-2xl p-5 sm:p-6 space-y-4 shadow-sm"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E4E4E7] pb-4">
          <div>
            <h3 className="text-base font-bold text-[#18181B]">
              {t("contacts.trustedContacts")}
            </h3>
            <p className="text-xs text-[#71717A]">
              {t("contacts.trustedDesc")}
            </p>
          </div>
          <button
            id="btn-open-add-contact"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#EF4444] hover:bg-red-600 text-white rounded-xl text-xs font-bold shadow-sm transition-all self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>{t("contacts.addContact")}</span>
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-[#EF4444] mx-auto mb-2" />
            <p className="text-xs text-[#71717A]">{t("contacts.loading")}</p>
          </div>
        ) : contacts.length === 0 ? (
          <div className="p-8 text-center bg-[#F4F4F5] border border-[#E4E4E7] rounded-xl space-y-2">
            <Shield className="w-8 h-8 text-[#A1A1AA] mx-auto" />
            <p className="text-xs font-bold text-[#18181B]">{t("contacts.noContacts")}</p>
            <p className="text-[11px] text-[#71717A] max-w-sm mx-auto">
              {t("contacts.noContactsDesc")}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {contacts.map((contact) => {
              const isEditing = editingContactId === contact.id;

              return (
                <div
                  key={contact.id}
                  id={`contact-row-${contact.id}`}
                  className="p-4 bg-[#F4F4F5] border border-[#E4E4E7] rounded-xl hover:border-zinc-400 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  {isEditing ? (
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Contact Name"
                        className="bg-white border border-[#E4E4E7] rounded-lg p-2 text-xs text-[#18181B] font-medium"
                      />
                      <input
                        type="text"
                        value={editRelationship}
                        onChange={(e) => setEditRelationship(e.target.value)}
                        placeholder="Relationship (e.g. Spouse)"
                        className="bg-white border border-[#E4E4E7] rounded-lg p-2 text-xs text-[#18181B] font-medium"
                      />
                      <input
                        type="tel"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        placeholder="Phone Number"
                        className="bg-white border border-[#E4E4E7] rounded-lg p-2 text-xs text-[#18181B] font-mono font-bold"
                      />
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[#18181B]">
                          {contact.name}
                        </span>
                        <span className="text-xs text-[#71717A] font-medium">
                          ({contact.relationship})
                        </span>
                        {contact.isPrimary && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                            <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                            <span>{t("contacts.primaryBadge")}</span>
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-mono text-[#52525B]">
                        {t("contacts.phone")}: {contact.phone}
                      </p>
                    </div>
                  )}

                  {/* Contact Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {isEditing ? (
                      <>
                        <button
                          onClick={() => handleSaveEditContact(contact.id)}
                          className="p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingContactId(null)}
                          className="p-2 bg-[#E4E4E7] hover:bg-zinc-300 text-[#18181B] rounded-lg text-xs"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <a
                          id={`btn-call-contact-${contact.id}`}
                          href={`tel:${contact.phone}`}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-transform active:scale-95 shadow-sm"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>{t("common.call")}</span>
                        </a>

                        {!contact.isPrimary && (
                          <button
                            onClick={() => handleSetPrimary(contact.id)}
                            className="p-1.5 text-[#71717A] hover:text-amber-500 rounded-lg hover:bg-[#E4E4E7] transition-colors"
                            title="Set as Primary Contact"
                          >
                            <Star className="w-4 h-4" />
                          </button>
                        )}

                        <button
                          onClick={() => handleStartEditContact(contact)}
                          className="p-1.5 text-[#71717A] hover:text-[#18181B] rounded-lg hover:bg-[#E4E4E7] transition-colors"
                          title="Edit Contact"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleDeleteContact(contact.id)}
                          className="p-1.5 text-[#71717A] hover:text-[#EF4444] rounded-lg hover:bg-[#E4E4E7] transition-colors"
                          title="Delete Contact"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Contact Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white border border-[#E4E4E7] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#E4E4E7] pb-3">
              <h4 className="font-bold text-[#18181B] text-base">
                {t("contacts.addContact")}
              </h4>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-xs font-bold text-[#71717A] hover:text-[#18181B] p-1 rounded hover:bg-[#F4F4F5]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddContact} className="space-y-3">
              <div>
                <label className="block text-[10px] uppercase font-bold text-[#71717A] mb-1">
                  {t("contacts.name")}
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-[#F4F4F5] border border-[#E4E4E7] rounded-xl p-2.5 text-sm text-[#18181B] font-medium focus:bg-white focus:outline-none focus:border-[#18181B]"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-[#71717A] mb-1">
                  {t("contacts.relationship")}
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Spouse, Parent, Sibling, Doctor"
                  value={newRelationship}
                  onChange={(e) => setNewRelationship(e.target.value)}
                  className="w-full bg-[#F4F4F5] border border-[#E4E4E7] rounded-xl p-2.5 text-sm text-[#18181B] font-medium focus:bg-white focus:outline-none focus:border-[#18181B]"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-[#71717A] mb-1">
                  {t("contacts.phone")}
                </label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. +91 9876543210"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full bg-[#F4F4F5] border border-[#E4E4E7] rounded-xl p-2.5 text-sm text-[#18181B] font-mono font-bold focus:bg-white focus:outline-none focus:border-[#18181B]"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="chk-primary"
                  checked={newIsPrimary}
                  onChange={(e) => setNewIsPrimary(e.target.checked)}
                  className="rounded border-[#E4E4E7] text-[#EF4444] focus:ring-[#EF4444]"
                />
                <label htmlFor="chk-primary" className="text-xs text-[#18181B] font-medium">
                  {t("contacts.setPrimary")}
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-1.5 text-xs font-bold text-[#71717A] hover:text-[#18181B] rounded-lg hover:bg-[#F4F4F5]"
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={savingContact}
                  className="px-5 py-2 bg-[#EF4444] hover:bg-red-600 text-white rounded-xl text-xs font-bold shadow-sm transition-colors"
                >
                  {savingContact ? t("common.save") + "..." : t("contacts.addContact")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

