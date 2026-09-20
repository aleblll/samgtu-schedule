export interface SamgtuGroupMeta {
  name: string;
  samgtuName: string;
  samgtuGroupId: number;
}

export const SAMGTU_GROUP_MAP: Record<string, SamgtuGroupMeta> = {
  'ingt-310': { name: '3-ИНГТ-110', samgtuName: 'Группа 24ИНГТ-110', samgtuGroupId: 31647 },
  'ingt-311': { name: '3-ИНГТ-111', samgtuName: 'Группа 24ИНГТ-111', samgtuGroupId: 31663 },
  'faid-310': { name: '3-ФАИД-110', samgtuName: 'Группа 24ФАД-110', samgtuGroupId: 31745 },
  'ingt-301': { name: '3-ИНГТ-101', samgtuName: 'Группа 24ИНГТ-101', samgtuGroupId: 31661 },
  'ingt-303': { name: '3-ИНГТ-103', samgtuName: 'Группа 24ИНГТ-103', samgtuGroupId: 31659 },
  'ingt-209': { name: '2-ИНГТ-109', samgtuName: 'Группа 25ИНГТ-109', samgtuGroupId: 32385 },
  'htf-215':  { name: '2-ХТФ-115',  samgtuName: 'Группа 25ХТФ-115',  samgtuGroupId: 32410 }
};
