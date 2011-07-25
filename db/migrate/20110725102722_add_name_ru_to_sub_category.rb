class AddNameRuToSubCategory < ActiveRecord::Migration
  def self.up
    add_column :sub_categories, :name_ru, :string
  end

  def self.down
    remove_column :sub_categories, :name_ru
  end
end
