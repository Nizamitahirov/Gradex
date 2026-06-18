import { describe, it, expect } from "vitest";
import { suggestBand } from "./banding-suggest";

describe("suggestBand — GGS decision tree", () => {
  it("IC: no functional knowledge → Band 1", () => {
    expect(suggestBand({ managingPeopleFocus: false, specificFunctionalKnowledge: false }).band).toBe("1");
  });

  it("IC: knowledge but no professional independence → Band 2", () => {
    expect(
      suggestBand({ managingPeopleFocus: false, specificFunctionalKnowledge: true, independentProfessionalExpertise: false }).band,
    ).toBe("2");
  });

  it("IC: professional, not SME → Band 3IC", () => {
    expect(
      suggestBand({
        managingPeopleFocus: false,
        specificFunctionalKnowledge: true,
        independentProfessionalExpertise: true,
        subjectMatterExpert: false,
      }).band,
    ).toBe("3IC");
  });

  it("IC: subject matter expert → Band 4IC", () => {
    expect(
      suggestBand({
        managingPeopleFocus: false,
        specificFunctionalKnowledge: true,
        independentProfessionalExpertise: true,
        subjectMatterExpert: true,
      }).band,
    ).toBe("4IC");
  });

  it("M: supervises operators (not professionals) → Band 3M", () => {
    expect(
      suggestBand({ managingPeopleFocus: true, manageProfessionalsOrManagers: false }).band,
    ).toBe("3M");
  });

  it("M: manages professionals, no functional strategy → Band 4M", () => {
    expect(
      suggestBand({ managingPeopleFocus: true, manageProfessionalsOrManagers: true, setFunctionalStrategy: false }).band,
    ).toBe("4M");
  });

  it("M: sets functional strategy, not business strategy → Band 5FS", () => {
    expect(
      suggestBand({
        managingPeopleFocus: true,
        manageProfessionalsOrManagers: true,
        setFunctionalStrategy: true,
        setBusinessStrategy: false,
      }).band,
    ).toBe("5FS");
  });

  it("M: sets business strategy but not CEO → Band 5BS", () => {
    expect(
      suggestBand({
        managingPeopleFocus: true,
        manageProfessionalsOrManagers: true,
        setFunctionalStrategy: true,
        setBusinessStrategy: true,
        isCeo: false,
      }).band,
    ).toBe("5BS");
  });

  it("M: the top job → CEO", () => {
    expect(
      suggestBand({
        managingPeopleFocus: true,
        manageProfessionalsOrManagers: true,
        setFunctionalStrategy: true,
        setBusinessStrategy: true,
        isCeo: true,
      }).band,
    ).toBe("ceo");
  });

  it("returns the correct career path", () => {
    expect(suggestBand({ managingPeopleFocus: false, specificFunctionalKnowledge: false }).path).toBe("IC");
    expect(suggestBand({ managingPeopleFocus: true, manageProfessionalsOrManagers: false }).path).toBe("M");
  });
});
