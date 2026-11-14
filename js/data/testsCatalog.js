// Master Catalog of CLAT PG Mock Tests (4 Full-Length 120-Q Mocks, 3 PYQ Papers & 4 Subject Sectionals)
// Built from 48 Authentic Legal Passages (288 Unique Questions with Full Case Citations & Explanations)

(function () {
  function buildTest(config) {
    let globalQNo = 1;
    const passages = config.passages.map((p, pIdx) => {
      const passageNum = pIdx + 1;
      const questions = p.questions.map((q, qIdx) => {
        return {
          globalQNo: globalQNo++,
          passageIndex: pIdx,
          passageNumber: passageNum,
          localQNo: qIdx + 1,
          subject: p.subject,
          topic: p.topic,
          caseTitle: p.caseTitle,
          citation: p.citation,
          question: q.question,
          options: q.options.slice(),
          correctOption: q.correctOption,
          explanation: q.explanation
        };
      });
      return {
        id: p.id,
        passageNumber: passageNum,
        subject: p.subject,
        topic: p.topic,
        caseTitle: p.caseTitle,
        citation: p.citation,
        passageText: p.passageText,
        questions: questions
      };
    });

    const allQuestions = [];
    passages.forEach(p => {
      p.questions.forEach(q => allQuestions.push(q));
    });

    return {
      id: config.id,
      title: config.title,
      category: config.category, // 'Full-Length Mock' | 'PYQ Paper' | 'Sectional Test'
      badge: config.badge,
      description: config.description,
      durationMinutes: config.durationMinutes,
      positiveMarks: 1.0,
      negativeMarks: 0.25,
      totalQuestions: allQuestions.length,
      totalPassages: passages.length,
      maxMarks: allQuestions.length * 1.0,
      recommendedPhase: config.recommendedPhase,
      passages: passages,
      questions: allQuestions
    };
  }

  const constRecent = window.PASSAGES_CONST_RECENT || [];          // 5 Passages (30 Qs)
  const pyq2024 = window.PASSAGES_PYQ_2024 || [];                  // 5 Passages (30 Qs)
  const pyq2022_23 = window.PASSAGES_PYQ_2022_23 || [];            // 5 Passages (30 Qs)
  const jurisprudence = window.PASSAGES_JURISPRUDENCE || [];        // 4 Passages (24 Qs)
  const coreLaws = window.PASSAGES_CORE_LAWS || [];                // 5 Passages (30 Qs)
  const pyq2025Real = window.PASSAGES_PYQ_2025_REAL || [];         // 6 Passages (36 Qs)
  const pyq2020_23Real = window.PASSAGES_PYQ_2020_23_REAL || [];   // 6 Passages (36 Qs)
  const advMock1 = window.PASSAGES_ADVANCED_MOCK_1 || [];          // 6 Passages (36 Qs)
  const advMock2 = window.PASSAGES_ADVANCED_MOCK_2 || [];          // 6 Passages (36 Qs)

  // 1. Full-Length Mock Test 1 (20 Passages = 120 Qs)
  const fullMock1Passages = [
    ...constRecent,                 // 5 Passages (30 Qs)
    ...pyq2024.slice(0, 4),         // 4 Passages (24 Qs)
    ...pyq2022_23.slice(0, 4),      // 4 Passages (24 Qs)
    ...jurisprudence.slice(0, 3),   // 3 Passages (18 Qs)
    ...coreLaws.slice(0, 4)         // 4 Passages (24 Qs)
  ];

  // 2. Full-Length Mock Test 2 (20 Passages = 120 Qs — Brand-new 24 Passages Pool)
  const fullMock2Passages = [
    ...pyq2025Real,                 // 6 Passages (36 Qs) - AMU 7-J, Delhi Services, Maharashtra Tenth Schedule, ECI Appointment, Puttaswamy/Anuradha Bhasin, Climate Right
    ...pyq2020_23Real,              // 6 Passages (36 Qs) - Sabarimala, Joseph Shine/Navtej, Lalita Kumari/Tofan Singh, Bachan Singh/Manoj, Kailash Nath/Energy Watchdog, Tata v Cyrus/IBC
    ...advMock1.slice(0, 4),        // 4 Passages (24 Qs) - Admin Law, Torts/Medical Negligence, UNCLOS/Enrica Lexie, Labour Law
    ...advMock2.slice(0, 4)         // 4 Passages (24 Qs) - Electronic/Discovery Evidence, Transfer of Property, Specific Relief 2018, Joint Criminal Liability
  ];

  // 3. Full-Length Mock Test 3 (20 Passages = 120 Qs — Constitutional, Statutory & Doctrinal Synthesis)
  const fullMock3Passages = [
    ...advMock1.slice(4, 6),        // 2 Passages (12 Qs) - GST Federalism (Mohit Minerals) & Statutory Interpretation
    ...advMock2.slice(4, 6),        // 2 Passages (12 Qs) - Possession/Corporate Personality & Governor Art. 200 / Ordinances
    pyq2024[4],                     // 1 Passage (6 Qs) - Jallikattu Cultural Rights
    pyq2022_23[4],                  // 1 Passage (6 Qs) - 7-J Stamp Act & Arbitration Interplay
    jurisprudence[3],               // 1 Passage (6 Qs) - Pound, Savigny, Maine, Rawls & Finnis
    coreLaws[4],                    // 1 Passage (6 Qs) - Novartis s.3(d), DU Photocopy & Swiss Ribbons IBC
    ...pyq2025Real.slice(0, 4),     // 4 Passages (24 Qs)
    ...constRecent.slice(0, 4),     // 4 Passages (24 Qs)
    ...advMock2.slice(0, 4)         // 4 Passages (24 Qs)
  ];

  // 4. Full-Length Mock Test 4 (20 Passages = 120 Qs — Grand Final All-Subject Revision Simulator)
  const fullMock4Passages = [
    constRecent[0], constRecent[1], constRecent[3],
    pyq2025Real[0], pyq2025Real[2], pyq2025Real[4], pyq2025Real[5],
    pyq2024[0], pyq2024[1], pyq2024[3],
    pyq2020_23Real[0], pyq2020_23Real[2], pyq2020_23Real[3], pyq2020_23Real[4],
    jurisprudence[0], jurisprudence[2],
    advMock1[1], advMock1[2],
    advMock2[0], advMock2[1]
  ];

  window.CLAT_TESTS = [
    // ==================== FULL-LENGTH 120-Q MOCKS ====================
    buildTest({
      id: "clat-pg-full-mock-1",
      title: "CLAT PG 2027 Full-Length Mock Test 1 (All-India Benchmark Simulator)",
      category: "Full-Length Mock",
      badge: "Full Mock 1 • 120 Qs • 20 Passages",
      description: "Complete 2-hour, 120-question full-length simulation strictly matching the Consortium of NLUs pattern across Constitutional Law, Jurisprudence, Criminal Law, Family Law, Arbitration, Environment & International Law.",
      durationMinutes: 120,
      recommendedPhase: "Benchmark Diagnostic / Phase 4",
      passages: fullMock1Passages
    }),

    buildTest({
      id: "clat-pg-full-mock-2",
      title: "CLAT PG 2027 Full-Length Mock Test 2 (Redacted [1] Citation & PYQ Simulator)",
      category: "Full-Length Mock",
      badge: "Full Mock 2 • 120 Qs • 20 Passages",
      description: "Features authentic CLAT PG redacted [1], [2] case excerpts covering AMU 7-Judge Bench, Delhi Services, Maharashtra Tenth Schedule, Sabarimala, Bachan Singh/Manoj sentencing, UNCLOS Enrica Lexie, TPA, SRA 2018 & BSA 2023.",
      durationMinutes: 120,
      recommendedPhase: "Phase 4: Full-Length Stamina",
      passages: fullMock2Passages
    }),

    buildTest({
      id: "clat-pg-full-mock-3",
      title: "CLAT PG 2027 Full-Length Mock Test 3 (Constitution Bench & Statutory Master)",
      category: "Full-Length Mock",
      badge: "Full Mock 3 • 120 Qs • 20 Passages",
      description: "High-difficulty 120-question simulator integrating Mohit Minerals (GST Council), Governor's Powers (Art. 200), Krishna Kumar Singh (7-J Ordinances), Statutory Interpretation, Possession/Personality & 7-J Arbitration.",
      durationMinutes: 120,
      recommendedPhase: "Phase 4: Advanced Simulation",
      passages: fullMock3Passages
    }),

    buildTest({
      id: "clat-pg-full-mock-4",
      title: "CLAT PG 2027 Full-Length Mock Test 4 (Grand Final Dress Rehearsal)",
      category: "Full-Length Mock",
      badge: "Full Mock 4 • 120 Qs • 20 Passages",
      description: "Curated 20-passage dress rehearsal blending the highest-probability Constitution Bench rulings, Criminal Law (Virsa Singh, Nanavati, Pulukuri Kottaya, Arjun Panditrao), Contract Damages & Analytical Jurisprudence.",
      durationMinutes: 120,
      recommendedPhase: "Final Week Dress Rehearsal",
      passages: fullMock4Passages
    }),

    // ==================== OFFICIAL PATTERN PYQ PAPERS ====================
    buildTest({
      id: "clat-pg-pyq-2025",
      title: "CLAT PG 2024–2025 – Redacted [1] Official Pattern PYQ Paper",
      category: "PYQ Paper",
      badge: "PYQ 2024–25 • 36 Qs • 6 Passages",
      description: "Authentic redacted [1] passage format covering AMU Minority Status (7-J), GNCTD v. UOI (Art. 239AA Services), Subhash Desai (Maharashtra Crisis), Anoop Baranwal (ECI Appointment), Puttaswamy/Anuradha Bhasin & Climate Right.",
      durationMinutes: 36,
      recommendedPhase: "Phase 1: PYQ Deconstruction",
      passages: pyq2025Real
    }),

    buildTest({
      id: "clat-pg-pyq-2024",
      title: "CLAT PG 2024 – Official Pattern & Landmark Passages (PYQ)",
      category: "PYQ Paper",
      badge: "PYQ 2024 • 30 Qs • 5 Passages",
      description: "Focused PYQ test covering the defining Constitution Bench passages of the 2024 cycle: Supriyo (Marriage Equality), Shilpa Sailesh (Art. 142 Divorce), Kaushal Kishor (Horizontal Rights), Sita Soren (Bribery Immunity) & Jallikattu.",
      durationMinutes: 30,
      recommendedPhase: "Phase 1: PYQ Deconstruction",
      passages: pyq2024
    }),

    buildTest({
      id: "clat-pg-pyq-2020-23",
      title: "CLAT PG 2020–2023 – Consolidated High-Yield PYQ Paper",
      category: "PYQ Paper",
      badge: "PYQ 2020–23 • 66 Qs • 11 Passages",
      description: "Comprehensive 11-passage PYQ test covering Janhit Abhiyan (EWS), Sabarimala, Joseph Shine & Navtej Johar, Lalita Kumari & Tofan Singh, Bachan Singh & Manoj, Kailash Nath & Energy Watchdog, Tata v. Cyrus Mistry, MTP Act & Stamp Act 7-J.",
      durationMinutes: 66,
      recommendedPhase: "Phase 1: Complete PYQ Mastery",
      passages: [...pyq2022_23, ...pyq2020_23Real]
    }),

    // ==================== SUBJECT & CASE SECTIONAL TESTS ====================
    buildTest({
      id: "clat-pg-sec-const-recent",
      title: "Sectional Test 1: 5, 7 & 9-Judge Constitution Bench Rulings (2023–2025)",
      category: "Sectional Test",
      badge: "Constitutional Law • 36 Qs",
      description: "Covers Davinder Singh (SC/ST Sub-classification 7-J), Electoral Bonds (5-J), Property Owners Association (Art. 39(b) 9-J), Mineral Area Development Authority (Royalty vs Tax 9-J), In Re: Article 370 & Governor's Powers (Art. 200).",
      durationMinutes: 36,
      recommendedPhase: "Phase 2: Constitutional Mastery",
      passages: [...constRecent, advMock2[5]]
    }),

    buildTest({
      id: "clat-pg-sec-jurisprudence",
      title: "Sectional Test 2: Jurisprudence, Legal Theory & Statutory Interpretation",
      category: "Sectional Test",
      badge: "Jurisprudence • 36 Qs • 6 Passages",
      description: "Covers Austin vs H.L.A. Hart, Kelsen's Grundnorm, Fuller & Dworkin, Hohfeld's Jural Relations, Pound, Savigny, Maine, Rawls, Finnis, Possession (Savigny vs Ihering & Finder's Law), Corporate Personality & Statutory Interpretation.",
      durationMinutes: 36,
      recommendedPhase: "Phase 1: Core Doctrines",
      passages: [...jurisprudence, advMock1[5], advMock2[4]]
    }),

    buildTest({
      id: "clat-pg-sec-core-laws",
      title: "Sectional Test 3: Criminal Law (IPC/BNS, CrPC/BNSS, Evidence/BSA) & Family Law",
      category: "Sectional Test",
      badge: "Criminal & Family • 30 Qs",
      description: "Covers Bilkis Bano Remission (2024), Arjun Panditrao (s.65B IEA / s.63 BSA), Pulukuri Kottaya (s.27 Discovery), Barendra Kumar Ghosh & Mahbub Shah (s.34 vs s.149), Virsa Singh, Nanavati & Vineeta Sharma / Revanasiddappa.",
      durationMinutes: 30,
      recommendedPhase: "Phase 3: Criminal & Family Law",
      passages: [coreLaws[0], coreLaws[1], advMock2[0], advMock2[3], pyq2020_23Real[2]]
    }),

    buildTest({
      id: "clat-pg-sec-commercial-public",
      title: "Sectional Test 4: Commercial, Contract, Torts, Property, Tax, Labour & International Law",
      category: "Sectional Test",
      badge: "Commercial & Public • 48 Qs • 8 Passages",
      description: "Covers Cox & Kings + CORE (Arbitration), Specific Relief 2018 Amendment & Guarantee, Transfer of Property Act, Torts & Medical Negligence (Bolam Test), Labour Law (Bangalore Water Supply), GST Federalism, UNCLOS & IPR/IBC.",
      durationMinutes: 48,
      recommendedPhase: "Phase 3: Statutory & Commercial Breadth",
      passages: [coreLaws[2], coreLaws[3], coreLaws[4], advMock1[0], advMock1[1], advMock1[2], advMock1[3], advMock2[1]]
    })
  ];

  window.registerClatTest = function (testConfig) {
    const built = buildTest(testConfig);
    const existingIdx = window.CLAT_TESTS.findIndex(t => t.id === built.id);
    if (existingIdx >= 0) {
      window.CLAT_TESTS[existingIdx] = built;
    } else {
      window.CLAT_TESTS.push(built);
    }
    return built;
  };
})();
