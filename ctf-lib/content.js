// Public challenge content for the NMT SOC Decision Challenge (V2).
// Rendered into the static pages. It must NEVER contain correct answers, flags or takeaways.
// Answer key: CTF_ANSWER_KEY secret. Flags: CTF_FLAG_* secrets. Takeaways: ctf-lib/server-content.js.
// Generated; option ids are random and carry no meaning.

export const EVENT = {
	title: 'CAN YOU TRUST THIS FILE?',
	subtitle: 'NMT SOC Decision Challenge',
	org: 'OPSWAT Academy × New Mexico Tech',
	maxScore: 100,
	defaultMinutes: 20,
};

export const PIPELINE = ['IDENTIFY', 'INSPECT', 'DETECT', 'ANALYZE', 'SANITIZE', 'POLICY', 'DECIDE'];

export const CHALLENGES = [
	{
		"id": "identity",
		"num": "01",
		"title": "WHO ARE YOU REALLY?",
		"points": 10,
		"stage": "IDENTIFY",
		"prompt": [
			"A vendor submitted @mesa-maintenance-notice.pdf.",
			"**Can you trust what the filename claims?**"
		],
		"downloads": [
			{
				"label": "DOWNLOAD SUSPECT FILE",
				"href": "/ctf-v2/artifacts/mesa-maintenance-notice.pdf"
			}
		],
		"evidence": [
			{
				"kind": "hex",
				"button": "INSPECT RAW",
				"title": "mesa-maintenance-notice.pdf",
				"rows": [
						{
							"offset": "00000000",
							"hex": "4D 45 53 41 20 43 4F 4E",
							"ascii": "MESA CON"
						},
						{
							"offset": "00000008",
							"hex": "54 52 4F 4C 53 0A 4D 61",
							"ascii": "TROLS.Ma"
						},
						{
							"offset": "00000010",
							"hex": "69 6E 74 65 6E 61 6E 63",
							"ascii": "intenanc"
						},
						{
							"offset": "00000018",
							"hex": "65 20 57 69 6E 64 6F 77",
							"ascii": "e Window"
						},
						{
							"offset": "00000020",
							"hex": "3A 20 32 30 32 36 2D 30",
							"ascii": ": 2026-0"
						},
						{
							"offset": "00000028",
							"hex": "39 2D 32 34 0A 54 69 63",
							"ascii": "9-24.Tic"
						},
						{
							"offset": "00000030",
							"hex": "6B 65 74 3A 20 4D 43 2D",
							"ascii": "ket: MC-"
						},
						{
							"offset": "00000038",
							"hex": "34 38 31 37 0A 50 75 72",
							"ascii": "4817.Pur"
						},
						{
							"offset": "00000040",
							"hex": "70 6F 73 65 3A 20 50 4C",
							"ascii": "pose: PL"
						},
						{
							"offset": "00000048",
							"hex": "43 20 76 69 73 75 61 6C",
							"ascii": "C visual"
						},
						{
							"offset": "00000050",
							"hex": "69 7A 61 74 69 6F 6E 20",
							"ascii": "ization "
						},
						{
							"offset": "00000058",
							"hex": "6D 61 69 6E 74 65 6E 61",
							"ascii": "maintena"
						}
					]
			}
		],
		"questions": [
			{
				"id": "q1",
				"text": "What is the most likely actual content type?",
				"type": "single",
				"options": [
					{
						"id": "ada",
						"text": "PDF document"
					},
					{
						"id": "e44",
						"text": "Plain text"
					},
					{
						"id": "70c",
						"text": "ZIP archive"
					},
					{
						"id": "faa",
						"text": "Windows executable"
					}
				]
			},
			{
				"id": "q2",
				"text": "Which statement is most accurate?",
				"type": "single",
				"options": [
					{
						"id": "739",
						"text": "The extension is only a claim; the bytes determine what the file actually is."
					},
					{
						"id": "cb6",
						"text": "File type can only be established by detonating the file in a sandbox."
					},
					{
						"id": "048",
						"text": "If a PDF reader cannot open it, it is a damaged PDF and still safe to treat as a PDF."
					},
					{
						"id": "b97",
						"text": "The .pdf extension is sufficient to classify the file."
					}
				]
			}
		]
	},
	{
		"id": "blind",
		"num": "02",
		"title": "GREEN BUT BLIND",
		"points": 15,
		"stage": "INSPECT",
		"prompt": [
			"A trusted vendor sends @field-controller-update.zip."
		],
		"downloads": [],
		"evidence": [
			{
				"kind": "record",
				"title": "Analysis record",
				"rows": [
					[
						"File",
						"field-controller-update.zip"
					],
					[
						"Size",
						"48.2 MB"
					],
					[
						"Received",
						"2026-09-24 09:12 MT · vendor portal"
					],
					[
						"Final banner",
						"No Threats Detected"
					],
					[
						"Archive type",
						"Encrypted ZIP"
					],
					[
						"Required scan stage",
						"MetaScan"
					],
					[
						"Stage result",
						"Failed"
					],
					[
						"Extraction result",
						"Not completed"
					],
					[
						"Reason",
						"Encrypted archive"
					]
				]
			},
			{
				"kind": "policy",
				"title": "Import policy",
				"text": "Vendor packages may enter the research environment only after all required inspection stages complete successfully."
			}
		],
		"questions": [
			{
				"id": "q1",
				"text": "Did the required inspection complete?",
				"type": "single",
				"options": [
					{
						"id": "791",
						"text": "Yes"
					},
					{
						"id": "037",
						"text": "No"
					}
				]
			},
			{
				"id": "q2",
				"text": "Does “No Threats Detected” prove the archive is clean?",
				"type": "single",
				"options": [
					{
						"id": "84f",
						"text": "Yes"
					},
					{
						"id": "ad4",
						"text": "No"
					}
				]
			},
			{
				"id": "q3",
				"text": "What is the best current decision?",
				"type": "single",
				"mono": true,
				"options": [
					{
						"id": "47e",
						"text": "ALLOW"
					},
					{
						"id": "8f8",
						"text": "SANITIZE"
					},
					{
						"id": "c73",
						"text": "QUARANTINE"
					},
					{
						"id": "d05",
						"text": "IGNORE"
					}
				]
			}
		]
	},
	{
		"id": "capable",
		"num": "03",
		"title": "CLEAN, BUT CAPABLE",
		"points": 20,
		"stage": "ANALYZE",
		"prompt": [
			"@vendor-maintenance-brief.pdf",
			"FileScan returns no malicious verdict.",
			"**Is there still evidence worth investigating?**"
		],
		"downloads": [
			{
				"label": "DOWNLOAD SAMPLE",
				"href": "/ctf-v2/artifacts/vendor-maintenance-brief.pdf"
			}
		],
		"external": {
			"label": "OPEN FILESCAN.IO",
			"href": "https://www.filescan.io/"
		},
		"evidenceButton": "VIEW LOCAL EVIDENCE",
		"evidence": [
			{
				"kind": "image",
				"title": "FileScan.IO · Overview",
				"src": "/ctf-v2/evidence/case-03/filescan-overview.png"
			},
			{
				"kind": "image",
				"title": "FileScan.IO · Threat Indicators",
				"src": "/ctf-v2/evidence/case-03/filescan-threat-indicators.png"
			},
			{
				"kind": "image",
				"title": "FileScan.IO · Extracted Files",
				"src": "/ctf-v2/evidence/case-03/filescan-extracted-files.png"
			},
			{
				"kind": "record",
				"title": "PDF structure (local parser)",
				"rows": [
					[
						"Header",
						"%PDF-1.3"
					],
					[
						"Size",
						"2,483 bytes · 1 page"
					],
					[
						"/Root",
						"/Type /Catalog  /Pages  /Names"
					],
					[
						"/Names",
						"/EmbeddedFiles"
					],
					[
						"/EmbeddedFiles",
						"[ (gateway.ini) → /Filespec ]"
					],
					[
						"/Filespec",
						"/F (gateway.ini)  /EF → obj 9"
					],
					[
						"obj 9",
						"/Type /EmbeddedFile · 33 bytes"
					],
					[
						"/OpenAction  /AA",
						"not present"
					],
					[
						"/JavaScript  /JS",
						"not present"
					],
					[
						"/URI  /Launch",
						"not present"
					]
				]
			},
			{
				"kind": "policy",
				"title": "Enclave policy",
				"text": "Maintenance PDFs entering the research enclave must not transport embedded attachments."
			}
		],
		"questions": [
			{
				"id": "q1",
				"text": "Does the document contain an embedded object or attachment?",
				"type": "single",
				"options": [
					{
						"id": "3cc",
						"text": "Yes"
					},
					{
						"id": "bd2",
						"text": "No"
					}
				]
			},
			{
				"id": "q2",
				"text": "Does the presence of an embedded benign object automatically make the PDF malware?",
				"type": "single",
				"options": [
					{
						"id": "158",
						"text": "Yes"
					},
					{
						"id": "6c6",
						"text": "No"
					}
				]
			},
			{
				"id": "q3",
				"text": "Given the enclave policy, what is the best action?",
				"type": "single",
				"mono": true,
				"options": [
					{
						"id": "406",
						"text": "ALLOW"
					},
					{
						"id": "d4b",
						"text": "SANITIZE"
					},
					{
						"id": "c0a",
						"text": "BLOCK"
					},
					{
						"id": "da7",
						"text": "IGNORE"
					}
				]
			}
		]
	},
	{
		"id": "objective",
		"num": "04",
		"title": "SAFE FOR WHICH OBJECTIVE?",
		"points": 20,
		"stage": "POLICY",
		"prompt": [
			"A researcher wants to send @research-access-export.txt outside the research enclave."
		],
		"downloads": [
			{
				"label": "DOWNLOAD FILE",
				"href": "/ctf-v2/artifacts/research-access-export.txt"
			}
		],
		"evidence": [
			{
				"kind": "record",
				"title": "Scan report · research-access-export.txt",
				"rows": [
					[
						"Malware scan",
						"No engines flagged"
					],
					[
						"DLP",
						"Sensitive data detected"
					],
					[
						"Detected categories",
						"Credit card-like value\nSSN-like value\nIPv4 address"
					]
				]
			},
			{
				"kind": "policy",
				"title": "Data-transfer policy",
				"text": "Files containing regulated/sensitive values may leave the research enclave only after approved redaction. The business content should be preserved where possible."
			}
		],
		"questions": [
			{
				"id": "q1",
				"text": "Is there malware evidence?",
				"type": "single",
				"options": [
					{
						"id": "8de",
						"text": "Yes"
					},
					{
						"id": "231",
						"text": "No"
					}
				]
			},
			{
				"id": "q2",
				"text": "Is there a data-governance problem?",
				"type": "single",
				"options": [
					{
						"id": "9a6",
						"text": "Yes"
					},
					{
						"id": "4b6",
						"text": "No"
					}
				]
			},
			{
				"id": "q3",
				"text": "What action best satisfies the policy?",
				"type": "single",
				"mono": true,
				"options": [
					{
						"id": "a1e",
						"text": "ALLOW"
					},
					{
						"id": "c49",
						"text": "BLOCK"
					},
					{
						"id": "82c",
						"text": "SANITIZE"
					},
					{
						"id": "490",
						"text": "IGNORE"
					}
				]
			}
		]
	},
	{
		"id": "boundary",
		"num": "05",
		"title": "THE FINAL BOUNDARY",
		"points": 35,
		"stage": "DECIDE",
		"headline": "MESA CONTROLS — EMERGENCY UPDATE",
		"prompt": [
			"Operations needs a vendor update inside the research environment within 30 minutes.",
			"The vendor is trusted.",
			"You are the analyst on duty.",
			"**Decide whether this package crosses the trust boundary.**",
			"@Mesa_HMI_Emergency_Update.pdf"
		],
		"downloads": [],
		"stepper": true,
		"evidence": [
			{
				"kind": "record",
				"title": "Evidence 1 · Identity",
				"rows": [
					[
						"Submitted name",
						"Mesa_HMI_Emergency_Update.pdf"
					],
					[
						"Detected structure",
						"ZIP archive"
					],
					[
						"Declared extension",
						".pdf"
					]
				]
			},
			{
				"kind": "tree",
				"title": "Evidence 2 · Contents",
				"lines": [
					"Mesa_HMI_Emergency_Update.pdf",
					"├── release-notes.txt",
					"├── hmi-config.json",
					"├── diagnostics/",
					"│   └── collector.js",
					"└── firmware/",
					"    └── patch.bin"
				]
			},
			{
				"kind": "record",
				"title": "Evidence 3 · Inspection status",
				"rows": [
					[
						"Parent malware scan",
						"No engines flagged"
					],
					[
						"diagnostics/collector.js",
						""
					],
					[
						"  Static inspection",
						"Completed"
					],
					[
						"  Malware verdict",
						"No Threat Detected"
					],
					[
						"  Active script capability",
						"Present"
					],
					[
						"firmware/patch.bin",
						""
					],
					[
						"  Required inspection stage",
						"Not completed"
					],
					[
						"  Reason",
						"Unsupported / unable to inspect"
					]
				]
			},
			{
				"kind": "policy",
				"title": "Evidence 4 · OT Research Import Policy",
				"text": "1. Vendor packages must match their declared file type.\n2. Every child object must complete required inspection.\n3. A package with a type mismatch or an uninspected child must be quarantined for security review before import."
			}
		],
		"questions": [
			{
				"id": "q1",
				"text": "What is the correct decision?",
				"type": "single",
				"mono": true,
				"options": [
					{
						"id": "fc4",
						"text": "ALLOW"
					},
					{
						"id": "f07",
						"text": "BLOCK"
					},
					{
						"id": "5f4",
						"text": "SANITIZE"
					},
					{
						"id": "d0f",
						"text": "QUARANTINE"
					},
					{
						"id": "72e",
						"text": "ESCALATE"
					}
				]
			},
			{
				"id": "q2",
				"text": "Select the TWO strongest reasons for that decision.",
				"type": "multi",
				"pick": 2,
				"options": [
					{
						"id": "b8e",
						"text": "The package is urgent."
					},
					{
						"id": "5e2",
						"text": "The vendor is external."
					},
					{
						"id": "346",
						"text": "The parent antivirus scan returned zero detections."
					},
					{
						"id": "5e9",
						"text": "The submitted .pdf does not match the detected ZIP structure."
					},
					{
						"id": "a37",
						"text": "A JavaScript file exists in the package."
					},
					{
						"id": "776",
						"text": "A child object did not complete required inspection."
					}
				]
			}
		]
	}
];

export const CHALLENGE_IDS = CHALLENGES.map((c) => c.id);
export const TOTAL_POINTS = CHALLENGES.reduce((s, c) => s + c.points, 0);
export const CASE_COUNT = CHALLENGES.length;
