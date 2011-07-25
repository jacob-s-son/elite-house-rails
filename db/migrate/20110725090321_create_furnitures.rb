class CreateFurnitures < ActiveRecord::Migration
  def self.up
    create_table :furnitures do |t|

      t.timestamps
    end
  end

  def self.down
    drop_table :furnitures
  end
end
