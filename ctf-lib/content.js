// Public challenge content for the NMT SOC Decision Challenge.
// This file is shipped to the browser. It must NEVER contain correct answers or flags.
// The answer key lives only in the CTF_ANSWER_KEY secret; flags in CTF_FLAG_* secrets.

export const EVENT = {
	title: 'CAN YOU TRUST THIS FILE?',
	subtitle: 'NMT SOC Decision Challenge',
	tagline: '4 cases · 20 minutes · 100 points',
	org: 'OPSWAT Academy × New Mexico Tech',
	maxScore: 100,
	defaultMinutes: 20,
};

export const PIPELINE = ['IDENTIFY', 'INSPECT', 'DETECT', 'ANALYZE', 'SANITIZE', 'POLICY', 'DECIDE'];


export const CHALLENGES = [
	{
		id: "impostor",
		num: "01",
		title: "THE IMPOSTOR",
		points: 20,
		stage: "IDENTIFY",
		brief: [
			"A contractor sends:",
			"@file 02-nmt-safe-baseline-renamed.pdf",
			"The filename says PDF.",
			"**What do the bytes say?**"
		],
		evidenceLabel: "OPEN EVIDENCE",
		downloads: [
			{
				label: "DOWNLOAD FILE",
				href: "/ctf/artifacts/02-nmt-safe-baseline-renamed.pdf",
				note: "Safe training file (plain text renamed to .pdf)"
			}
		],
		evidence: [
			{
				src: "/ctf/evidence/challenge-01/identity-renamed-file-details.png",
				caption: "MetaDefender rehearsal scan — File Details: 02-nmt-safe-baseline-renamed.pdf",
				notes: [
					"Original file name ends in .pdf, but File Type = ASCII Text (extension: txt)",
					"Red warning: \"File type mismatch, the file type is txt\"",
					"SHA-256 4332CE70…404A6CC325D87: identical to the original 01-nmt-safe-baseline.txt from the workshop"
				]
			}
		],
		questions: [
			{
				id: "q1",
				text: "What is the actual detected file type?",
				options: [
					{
						id: "791",
						text: "PDF"
					},
					{
						id: "21d",
						text: "ZIP Archive"
					},
					{
						id: "47f",
						text: "Executable"
					},
					{
						id: "7e8",
						text: "ASCII Text"
					}
				]
			},
			{
				id: "q2",
				text: "Did renaming .txt to .pdf change the file bytes?",
				options: [
					{
						id: "9f6",
						text: "Yes"
					},
					{
						id: "86d",
						text: "No"
					}
				]
			},
			{
				id: "q3",
				text: "Which statement is most accurate?",
				options: [
					{
						id: "72a",
						text: "The extension is a claim; file structure/content is the evidence."
					},
					{
						id: "ffa",
						text: "Renaming the file changed its SHA-256 hash."
					},
					{
						id: "cac",
						text: "File type can only be determined by opening the file in a viewer."
					},
					{
						id: "80e",
						text: "The .pdf extension proves the file is a PDF."
					}
				]
			}
		],
		takeaway: "A filename is a claim. The bytes are the evidence."
	},
	{
		id: "box",
		num: "02",
		title: "THE BOX",
		points: 25,
		stage: "INSPECT",
		brief: [
			"A trusted vendor sends a ZIP package:",
			"@file 02-vendor-update-with-test-artifact.zip",
			"At parent scope, antivirus does not appear to flag the container.",
			"**Recursive inspection reveals something else.**"
		],
		safetyNote: "Evidence only. The archive itself is not distributed.",
		evidenceLabel: "OPEN ARCHIVE EVIDENCE",
		downloads: [],
		evidence: [
			{
				src: "/ctf/evidence/challenge-02/vendor-parent-archive.png",
				caption: "Parent scope: 02-vendor-update-with-test-artifact.zip",
				notes: [
					"Parent (ZIP container) result: No Threats Detected",
					"MetaScan at parent scope: No Engines Flagged",
					"Deep CDR: Blocked (sanitization failed)"
				]
			},
			{
				src: "/ctf/evidence/challenge-02/vendor-child-result.png",
				caption: "Child scope, after recursive extraction: tools/diagnostic-test.com",
				notes: [
					"Files in archive: README.txt, config/gateway.ini, tools/diagnostic-test.com",
					"tools/diagnostic-test.com: Threats Detected",
					"MetaScan: 17 / 23 engines flagged · Predictive AI: detected · Adaptive Sandbox: malicious"
				]
			}
		],
		questions: [
			{
				id: "q1",
				text: "Which object changes your security decision?",
				mono: true,
				options: [
					{
						id: "465",
						text: "README.txt"
					},
					{
						id: "ae6",
						text: "02-vendor-update-with-test-artifact.zip (the parent)"
					},
					{
						id: "e64",
						text: "tools/diagnostic-test.com"
					},
					{
						id: "437",
						text: "config/gateway.ini"
					}
				]
			},
			{
				id: "q2",
				text: "Why can the parent archive and the child have different results?",
				options: [
					{
						id: "490",
						text: "The parent scan is broken and should be ignored."
					},
					{
						id: "843",
						text: "They are different analysis scopes; the child must be extracted and inspected independently."
					},
					{
						id: "7c8",
						text: "The scanner modified the child during extraction."
					},
					{
						id: "36a",
						text: "Compression turns malware into a safe file."
					}
				]
			},
			{
				id: "q3",
				text: "Which statement is most accurate?",
				options: [
					{
						id: "433",
						text: "Archives cannot contain executables."
					},
					{
						id: "230",
						text: "Recursive inspection disarms the payload."
					},
					{
						id: "e62",
						text: "If the parent is clean, every child is clean."
					},
					{
						id: "5fd",
						text: "Recursive inspection changes visibility, not the payload."
					}
				]
			}
		],
		takeaway: "Parent scope is not child scope. Visibility is a security control."
	},
	{
		id: "green",
		num: "03",
		title: "GREEN VERDICT",
		points: 30,
		stage: "ANALYZE",
		brief: [
			"Analyze:",
			"@file 05-nmt-maintenance-javascript.pdf",
			"FileScan.IO may report **No Threat Detected**.",
			"Your job is to investigate what sits behind the verdict."
		],
		safetyNote: "Harmless training file. Its JavaScript only shows a local alert. It makes no network calls, writes nothing to disk and runs no OS commands.",
		evidenceLabel: "VIEW FALLBACK EVIDENCE",
		external: {
			label: "OPEN FILESCAN.IO",
			href: "https://www.filescan.io/"
		},
		downloads: [
			{
				label: "DOWNLOAD PDF",
				href: "/ctf/artifacts/05-nmt-maintenance-javascript.pdf",
				note: "Upload this file to FileScan.IO"
			}
		],
		fallbackHint: "FileScan slow or Wi-Fi weak? The fallback evidence below has everything you need.",
		evidence: [
			{
				src: "/ctf/evidence/challenge-03/filescan-overview.png",
				caption: "FileScan.IO (MetaDefender Aether) decision engine: 05-nmt-maintenance-javascript.pdf",
				notes: [
					"Threat Reputation: 1 IOC",
					"Dynamic Analysis: 8 Threat Indicators",
					"Threat Scoring: final verdict = No Threat Detected (score 0.25)"
				]
			},
			{
				src: "/ctf/evidence/challenge-03/filescan-threat-indicators.png",
				caption: "FileScan.IO file details: tags and file identity",
				notes: [
					"Verdict banner: NO THREAT DETECTED",
					"File tags: pdf, javascript",
					"PDF document, version 1.3, 1 page, 1.72 kB"
				]
			},
			{
				src: "/ctf/evidence/challenge-03/filescan-yara.png",
				caption: "FileScan.IO: matched YARA rules",
				notes: [
					"4 YARA rules matched: Multiple_filtering, Possible_exploit, Invalid_trailer_structure, Suspicious_javascript_object",
					"Verdict still: No Threat Detected"
				]
			}
		],
		questions: [
			{
				id: "q1",
				text: "Does the PDF contain embedded JavaScript?",
				options: [
					{
						id: "8f6",
						text: "Yes"
					},
					{
						id: "cd3",
						text: "No"
					}
				]
			},
			{
				id: "q2",
				text: "Does a YARA match automatically prove malware?",
				options: [
					{
						id: "316",
						text: "Yes"
					},
					{
						id: "fc8",
						text: "No"
					}
				]
			},
			{
				id: "q3",
				text: "Which statement is most accurate?",
				options: [
					{
						id: "235",
						text: "YARA matches are the final verdict."
					},
					{
						id: "8fc",
						text: "Threat indicators are evidence requiring interpretation; they are not automatically the final verdict."
					},
					{
						id: "9cf",
						text: "\"No Threat Detected\" means the file carries no active content."
					},
					{
						id: "18a",
						text: "Any threat indicator means the file is malware and must be blocked."
					}
				]
			}
		],
		takeaway: "Indicators are evidence, not verdicts."
	},
	{
		id: "dlp",
		num: "04",
		title: "SAFE FROM WHAT?",
		points: 25,
		stage: "POLICY",
		brief: [
			"@file 10-nmt-access-roster-sensitive.txt",
			"Malware analysis is clean.",
			"DLP reports three sensitive-data objects.",
			"**Is the file safe?**"
		],
		policy: "Sensitive information is prohibited from crossing this security boundary.",
		safetyNote: "All sensitive-looking values are synthetic training data.",
		evidenceLabel: "OPEN DLP EVIDENCE",
		downloads: [],
		evidence: [
			{
				src: "/ctf/evidence/challenge-04/dlp-overview.png",
				caption: "MetaDefender overview: 10-nmt-access-roster-sensitive.txt",
				notes: [
					"MetaScan: No Engines Flagged · Predictive AI: Not Detected",
					"Proactive DLP: Detected, 3 Sensitive Objects"
				]
			},
			{
				src: "/ctf/evidence/challenge-04/dlp-data-loss-detail.png",
				caption: "Proactive DLP: Data Loss details",
				notes: [
					"Credit Card Numbers: 1 (Very High)",
					"Social Security Numbers: 1 (High)",
					"IPv4 Address: 1 (Very High)",
					"Values are synthetic training data"
				]
			}
		],
		questions: [
			{
				id: "q1",
				text: "Was malware detected?",
				options: [
					{
						id: "ff5",
						text: "Yes"
					},
					{
						id: "2be",
						text: "No"
					}
				]
			},
			{
				id: "q2",
				text: "Was sensitive information detected?",
				options: [
					{
						id: "b59",
						text: "Yes"
					},
					{
						id: "aa0",
						text: "No"
					}
				]
			},
			{
				id: "q3",
				text: "Under the stated policy, what action should the analyst take?",
				mono: true,
				options: [
					{
						id: "16b",
						text: "ALLOW"
					},
					{
						id: "24a",
						text: "BLOCK"
					},
					{
						id: "4be",
						text: "SANITIZE"
					},
					{
						id: "b1c",
						text: "IGNORE"
					}
				]
			}
		],
		takeaway: "Malware-clean does not mean data-safe."
	}
];

export const CHALLENGE_IDS = CHALLENGES.map((c) => c.id);
export const TOTAL_POINTS = CHALLENGES.reduce((s, c) => s + c.points, 0);
