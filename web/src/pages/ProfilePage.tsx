import React from "react";

export function ProfilePage() {
  return (
    <div className="gpt-scroll gpt-page-wrap">
      <h1 className="gpt-page-title">Profile</h1>
      <div className="gpt-page-card">
        <div className="gpt-page-card-title">Account</div>
        <p>TENMON-ARK (same-origin)</p>
      </div>
      <div className="gpt-page-card">
        <div className="gpt-page-card-title">Plan</div>
        <p>Default</p>
      </div>
      <div className="gpt-page-card">
        <div className="gpt-page-card-title">Data</div>
        <p>Stored in this browser. Use Settings to export/import.</p>
      </div>
    </div>
  );
}
