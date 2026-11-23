export function PatientFields({ p }: { p?: any }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <div><label className="label">Hospital number / MRN *</label><input name="mrn" className="input" required defaultValue={p?.mrn} /></div>
      <div className="md:col-span-2"><label className="label">Full name *</label><input name="fullName" className="input" required defaultValue={p?.full_name} /></div>
      <div><label className="label">Date of birth *</label><input name="dob" type="date" className="input" required defaultValue={p?.dob} /></div>
      <div><label className="label">Sex *</label><select name="sex" className="input" required defaultValue={p?.sex ?? ""}><option value="" disabled>Select…</option><option value="FEMALE">Female</option><option value="MALE">Male</option><option value="OTHER">Other</option><option value="UNKNOWN">Unknown</option></select></div>
      <div><label className="label">Weight (kg)</label><input name="weightKg" type="number" step="0.1" className="input" defaultValue={p?.weight_kg ?? ""} /></div>
      <div><label className="label">Contact number</label><input name="phone" className="input" defaultValue={p?.phone ?? ""} placeholder="+233 …" /></div>
      <div><label className="label">Email</label><input name="email" type="email" className="input" defaultValue={p?.email ?? ""} /></div>
      <div><label className="label">Address</label><input name="address" className="input" defaultValue={p?.address ?? ""} /></div>
      <div><label className="label">Next of kin</label><input name="nextOfKin" className="input" defaultValue={p?.next_of_kin ?? ""} /></div>
      <div><label className="label">Next of kin phone</label><input name="nextOfKinPhone" className="input" defaultValue={p?.next_of_kin_phone ?? ""} /></div>
    </div>
  );
}
