import { test, expect } from '../../fixtures/authenticated.fixture';

import { ApiClient } from '../../helpers/api-client.helper';

import {

  e2eFamilyName,

  e2eMemberName,

  todayBirthDateIso,

} from '../../helpers/test-data.helper';

import { FamiliesPage } from '../../pages/families.page';



test.describe('Families module', () => {

  let familyId = '';

  const memberIds: string[] = [];



  test.afterEach(async () => {

    const api = await ApiClient.asAdmin();

    if (familyId) {

      await api.deleteFamily(familyId).catch(() => undefined);

      familyId = '';

    }

    for (const id of memberIds.splice(0)) {

      await api.deleteMember(id).catch(() => undefined);

    }

  });



  test('FAM-01 — criar família e vincular membros', async ({ page }) => {

    const familyName = e2eFamilyName('FAM01');

    const memberName = e2eMemberName('FAM01-M');

    const api = await ApiClient.asAdmin();

    const member = await api.createMember({

      fullName: memberName,

      birthDate: todayBirthDateIso(1991),

      status: 'active',

    });

    memberIds.push(member.id);



    const families = new FamiliesPage(page);

    await families.goto();

    await families.openCreateDialog();

    await families.fillCreateForm(familyName);

    await families.saveForm();



    await families.search(familyName);

    await expect(page.getByText(familyName)).toBeVisible();



    const foundFamilyId = (await api.findFamilyIdByName(familyName)) ?? '';
    expect(foundFamilyId).toBeTruthy();
    familyId = foundFamilyId;



    await families.openMembers(familyId);

    await families.addMember(member.id);

    await expect(page.getByTestId(`family-member-row-${member.id}`)).toContainText(memberName);

  });



  test('FAM-02 — editar família', async ({ page }) => {

    const familyName = e2eFamilyName('FAM02');

    const api = await ApiClient.asAdmin();

    const created = await api.createFamily({ name: familyName });

    familyId = created.id;



    const families = new FamiliesPage(page);

    await families.goto();

    await families.search(familyName);

    await families.openEdit(familyId);

    await page.getByTestId('family-form-name').fill(`${familyName} Editada`);

    await families.saveForm();



    await families.search(`${familyName} Editada`);

    await expect(families.row(familyId)).toContainText(`${familyName} Editada`);

  });



  test('FAM-03 — remover membro da família', async ({ page }) => {

    const familyName = e2eFamilyName('FAM03');

    const memberName = e2eMemberName('FAM03-M');

    const api = await ApiClient.asAdmin();

    const member = await api.createMember({ fullName: memberName, status: 'active' });

    memberIds.push(member.id);

    const family = await api.createFamily({ name: familyName });
    familyId = family.id;
    await api.addFamilyMember(familyId, member.id, 'other');



    const families = new FamiliesPage(page);

    await families.goto();

    await families.search(familyName);

    await families.openMembers(familyId);

    await families.removeMember(member.id);

    await expect(page.getByTestId(`family-member-row-${member.id}`)).toHaveCount(0);

  });



  test('FAM-04 — relatório de aniversários carrega', async ({ page }) => {

    const families = new FamiliesPage(page);

    await families.gotoBirthdaysReport();



    await expect(page.getByTestId('family-birthdays-report')).toBeVisible();

    await expect(page.getByTestId('family-birthdays-filter-btn')).toBeVisible();

    const table = page.getByTestId('family-birthdays-table');

    const empty = page.getByText(/Sem aniversários|No birthdays|Sin cumpleaños/i);

    await table.or(empty).first().waitFor({ state: 'visible' });

  });



  test('FAM-05 — relatório lista aniversariante vinculado', async ({ page }) => {

    const familyName = e2eFamilyName('FAM05');

    const memberName = e2eMemberName('FAM05-M');

    const birthDate = todayBirthDateIso(1985);

    const month = new Date().getMonth() + 1;



    const api = await ApiClient.asAdmin();

    const member = await api.createMember({ fullName: memberName, birthDate, status: 'active' });

    memberIds.push(member.id);

    const family = await api.createFamily({ name: familyName });

    familyId = family.id;

    await api.addFamilyMember(familyId, member.id, 'other');



    const families = new FamiliesPage(page);

    await families.gotoBirthdaysReport();

    await families.filterBirthdaysByMonth(month);



    await expect(page.getByTestId('family-birthdays-table')).toBeVisible();

    await expect(page.getByTestId('family-birthdays-table')).toContainText(memberName);

    await expect(page.getByTestId('family-birthdays-table')).toContainText(familyName);

  });

});


