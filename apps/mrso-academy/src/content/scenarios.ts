import type { Scenario } from "@/components/labs/BranchingScenario";

export const screeningScenario: Scenario = {
  start: "form",
  debrief: [
    "Every answer — including 'no' and 'unsure' — is reviewed verbally by Level 2 MR personnel.",
    "Discrepancies and partial histories are resolved from records and imaging, not from reassurance.",
    "Orbital foreign-body risk is assessed under the local policy; a previous MRI does not exclude a fragment.",
    "Changing into a facility gown and a final check at the Zone IV door catch items missed earlier.",
    "Document sources consulted and who made each decision.",
  ],
  nodes: {
    form: {
      id: "form",
      title: "Questionnaire review",
      context:
        "Mr K, 58, is booked for a 3 T brain MRI. His written questionnaire is mostly 'No', but he has ticked 'Unsure' for 'Have you ever had metal in your eyes?' and 'Yes' for 'Previous heart surgery (2015)'.",
      prompt: "What do you do first?",
      next: "verbal",
      choices: [
        { text: "Proceed — most answers are 'No' and the surgery was years ago.", quality: "unsafe", feedback: "Previous cardiac surgery and an uncertain eye history are both red flags that must be resolved before Zone IV." },
        { text: "Go through every answer verbally with him, focusing on the surgery and the eye history.", quality: "best", feedback: "Two-stage screening: the verbal review clarifies uncertain answers and catches omissions." },
        { text: "Cancel the scan and send him home.", quality: "acceptable", feedback: "Premature. These questions can often be resolved on the day or by rebooking after information is gathered." },
      ],
    },
    verbal: {
      id: "verbal",
      title: "Verbal screening",
      context: "Mr K says the 2015 operation was 'a valve replacement' and adds, 'I think they put a little box in later for my heart rhythm, but I'm not sure.'",
      prompt: "How do you proceed?",
      next: "records",
      choices: [
        { text: "Heart valves are usually MR Conditional — proceed.", quality: "unsafe", feedback: "A possible CIED has just been disclosed. And valve conditions still need checking for the exact model." },
        { text: "Check the record, cardiology letters and prior chest imaging for the valve model and any device.", quality: "best", feedback: "Identify exact devices from primary sources before any risk decision." },
        { text: "Ask him to sign a disclaimer and proceed.", quality: "unsafe", feedback: "A disclaimer does not mitigate physical risk and is not part of safe practice." },
      ],
    },
    records: {
      id: "records",
      title: "Records found",
      context: "You find the operation note and a 2023 chest radiograph report.",
      facts: [
        "Mechanical aortic valve — manufacturer and model documented; current labelling reviewed by the MRSO: conditions compatible with your 3 T system.",
        "2023 chest radiograph: sternotomy wires and prosthetic valve. No CIED or leads.",
        "Cardiology letter: 'loop recorder discussed, not implanted'.",
        "On re-questioning: grinds metal as a hobby, no eye protection; no known eye injury.",
      ],
      prompt: "What about the eye history?",
      next: "changing",
      choices: [
        { text: "Apply the local orbital screening policy — review prior CT covering the orbits or obtain orbital radiographs.", quality: "best", feedback: "A metalwork history warrants screening for intra-orbital fragments under the local policy." },
        { text: "He reports no injury, so ignore it.", quality: "unsafe", feedback: "Fragments can enter the eye without a recognised injury. Policy-based screening is needed." },
        { text: "Refuse MRI permanently.", quality: "acceptable", feedback: "Too absolute. Screening can usually characterise the risk." },
      ],
    },
    changing: {
      id: "changing",
      title: "Preparing for the scan",
      context:
        "A 2024 CT head that includes the orbits was reported as showing no metallic foreign body; the radiologist confirms. Mr K arrives from changing in his own trousers with a fitness tracker on his wrist and a transdermal nicotine patch.",
      prompt: "Best action?",
      next: "door",
      choices: [
        { text: "Ask him to change into a facility gown, remove the tracker, and manage the patch according to local policy.", quality: "best", feedback: "Gowns remove hidden metal and conductive fibres. Some patches have metallic backing and can heat." },
        { text: "Trousers are fine if they have no zip.", quality: "unsafe", feedback: "Clothing can contain metallic fibres or hidden items. Facility gowns are the standard." },
        { text: "Leave the tracker on so you can see his heart rate.", quality: "unsafe", feedback: "Consumer wearables are not MR Conditional monitoring equipment." },
      ],
    },
    door: {
      id: "door",
      title: "Final check at the Zone IV door",
      context: "At the scanner-room door Mr K says, 'Oh — I'm still wearing my hearing aid.'",
      prompt: "What now?",
      choices: [
        { text: "Remove and store the hearing aid; complete the final check; ensure he can still follow instructions and use the call bell.", quality: "best", feedback: "The final check catches late items. Plan communication for reduced hearing." },
        { text: "Hearing aids are small — he can keep it in.", quality: "unsafe", feedback: "Hearing aids contain magnets and electronics. Remove them before Zone IV." },
      ],
    },
  },
};

export const emergencyScenario: Scenario = {
  start: "arrest",
  debrief: [
    "Remove the patient from Zone IV for resuscitation; never bring standard resuscitation equipment in.",
    "A designated gatekeeper meets the arrest team at Zone III.",
    "A quench is not the response to cardiac arrest.",
    "In fire, EPO removes electrical power but not the static field; firefighters must not enter Zone IV with ferromagnetic equipment.",
    "Document, report and debrief every emergency, and rehearse in drills.",
  ],
  nodes: {
    arrest: {
      id: "arrest",
      tone: "alert",
      title: "Patient unresponsive in the bore",
      context: "During a 1.5 T abdominal scan, the patient stops responding. On withdrawing the table you find no signs of life.",
      prompt: "Immediate priority?",
      next: "team",
      choices: [
        { text: "Call the arrest team with the MR-specific location, start BLS, and prepare to move the patient out of Zone IV.", quality: "best", feedback: "Summon help, begin CPR, and evacuate to the designated resuscitation area." },
        { text: "Start CPR on the MR table in the scanner room until the team arrives with the defibrillator.", quality: "unsafe", feedback: "The team and their equipment must not come into Zone IV. Plan to move the patient out." },
        { text: "Press the magnet emergency stop so the team can come in.", quality: "unsafe", feedback: "A quench takes time, may vent helium, and is not indicated. Evacuate the patient." },
      ],
    },
    team: {
      id: "team",
      tone: "alert",
      title: "The arrest team arrives",
      context: "You have moved the patient on the detachable table into the control-area resuscitation bay (Zone III). The team arrives with a defibrillator, oxygen cylinder and airway trolley. The Zone IV door is still open.",
      prompt: "What do you do next?",
      next: "fire",
      choices: [
        { text: "Close the Zone IV door, keep a gatekeeper on it, hand over to the team, and account for all staff.", quality: "best", feedback: "Secure Zone IV, hand over clearly, and prevent equipment being taken towards the magnet." },
        { text: "Leave the door open in case you need to go back for anything.", quality: "unsafe", feedback: "An open door in a chaotic emergency invites a projectile incident." },
        { text: "Help the team; no one is needed at the door now that the patient is out.", quality: "acceptable", feedback: "Partly right, but an explicitly assigned gatekeeper prevents late entries." },
      ],
    },
    fire: {
      id: "fire",
      tone: "alert",
      title: "Later that week: smoke from the equipment cabinet",
      context: "A patient is on the table when smoke appears from an electronics cabinet inside the scanner room.",
      prompt: "First actions?",
      next: "firefighters",
      choices: [
        { text: "Evacuate the patient from Zone IV, raise the fire alarm, and consider EPO for the electrical source per local procedure.", quality: "best", feedback: "People first. EPO cuts power to the electronics; it does not remove the static field." },
        { text: "Fetch the corridor CO₂ extinguisher and tackle the fire in the room.", quality: "unsafe", feedback: "Corridor extinguishers are usually ferromagnetic. Only MR Conditional extinguishers may enter Zone IV." },
        { text: "Quench immediately.", quality: "acceptable", feedback: "May become necessary under local procedure if responders must enter, but evacuation and alarm come first." },
      ],
    },
    firefighters: {
      id: "firefighters",
      tone: "alert",
      title: "Firefighters arrive",
      context: "The patient and staff are out. Firefighters in breathing apparatus with steel cylinders and tools want to enter the scanner room.",
      prompt: "How do you respond?",
      choices: [
        { text: "Stop them at Zone III, explain that the field is still on, and follow the local procedure (including whether a magnet stop is warranted) with the senior MR staff member.", quality: "best", feedback: "Firefighters must not enter Zone IV with ferromagnetic equipment while the field is present. The decision to quench is taken under local procedure." },
        { text: "Let them in — they're professionals with their own procedures.", quality: "unsafe", feedback: "Breathing apparatus cylinders and tools can become lethal projectiles." },
      ],
    },
  },
};

export const quenchScenario: Scenario = {
  start: "alarm",
  debrief: [
    "A falling helium level and cryogen alarms are early warnings — escalate to the vendor promptly.",
    "If helium vents into the room, evacuate and do not re-enter. Treat it as an oxygen-deficient atmosphere.",
    "EPO, evacuation and magnet stop are different controls with different effects.",
    "Magnet stop is reserved for specific situations (e.g. person pinned with risk to life or limb) under local procedure.",
  ],
  nodes: {
    alarm: {
      id: "alarm",
      title: "Compressor alarm",
      context: "At 08:00 the console shows a helium compressor fault and the coldhead is silent. The helium level has dropped since yesterday.",
      prompt: "What do you do?",
      next: "bang",
      choices: [
        { text: "Contact the vendor service team immediately and follow their instructions; inform estates about the chiller.", quality: "best", feedback: "Prolonged loss of recondensation raises quench risk. Early vendor involvement matters." },
        { text: "Keep scanning; it'll probably restart.", quality: "unsafe", feedback: "Ignoring cryogen alarms risks an unplanned quench." },
        { text: "Initiate a quench to be safe.", quality: "unsafe", feedback: "A deliberate quench is not the response to a compressor fault." },
      ],
    },
    bang: {
      id: "bang",
      tone: "alert",
      title: "Loud noise and white fog",
      context: "Later, with a patient on the table, there is a loud hiss and a white fog descends from the ceiling inside the scanner room. The O₂ monitor alarms.",
      prompt: "Immediate action?",
      next: "door",
      choices: [
        { text: "Get the patient and everyone out of the scanner room immediately and close the door if possible; don't re-enter.", quality: "best", feedback: "Possible quench with helium venting into the room: asphyxiation and cold-injury risk." },
        { text: "Finish the sequence quickly, then move the patient.", quality: "unsafe", feedback: "Every second in an oxygen-deficient atmosphere matters." },
        { text: "Go in alone to reassure the patient while the fog clears.", quality: "unsafe", feedback: "Entering creates a second casualty." },
      ],
    },
    door: {
      id: "door",
      tone: "alert",
      title: "The door is hard to open",
      context: "A colleague struggles to open the inward-opening scanner-room door.",
      prompt: "What explains this, and what should happen?",
      next: "after",
      choices: [
        { text: "Room pressure has risen from released gas. Follow the local procedure (e.g. pressure-relief measures, breaking the observation window if that is the designated route) and call for help.", quality: "best", feedback: "Released helium can over-pressurise the room. Facilities should have planned egress measures." },
        { text: "The magnetic field is holding the door shut.", quality: "unsafe", feedback: "The difficulty is pressure, not magnetism." },
      ],
    },
    after: {
      id: "after",
      title: "After evacuation",
      context: "Everyone is out and accounted for. The fog has cleared from the corridor side.",
      prompt: "Next steps?",
      choices: [
        { text: "Keep the room closed; escalate to vendor, estates and the MRSO/MRSE; report; do not resume until the quench pipe and room are cleared.", quality: "best", feedback: "Helium entering the room suggests a venting failure that must be investigated." },
        { text: "Re-enter to check the scanner once the fog clears.", quality: "unsafe", feedback: "Oxygen levels may still be low and the cause is unknown." },
      ],
    },
  },
};
