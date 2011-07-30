# This file should contain all the record creation needed to seed the database with its default values.
# The data can then be loaded with the rake db:seed (or created alongside the db with db:setup).
#
# Examples:
#
#   cities = City.create([{ :name => 'Chicago' }, { :name => 'Copenhagen' }])
#   Mayor.create(:name => 'Daley', :city => cities.first)

# if Category.find_by_name_ru()
# 
# [ {:code=>"EXW", :shipment_code_flag=>0, :description=>"No rūpnīcas (nodošanas vietas nosaukums)", :id => 1}, 
#   {:code=>"FCA", :shipment_code_flag=>0, :description=>"Franko pārvadātājs (nodošanas vietas nosaukums)", :id => 2}, 
#   {:code=>"CPT", :shipment_code_flag=>0, :description=>"Transportēšana apmaksāta līdz (galamērķa vietas nosaukums)", :id => 3}, 
#   {:code=>"CIP", :shipment_code_flag=>0, :description=>"Transportēšana un apdrošināšana apmaksāta līdz (galamērķa vietas nosaukums)", :id => 4}, 
#   {:code=>"DAT", :shipment_code_flag=>0, :description=>"Piegādāts līdz terminālam (galamērķa vietas vai ostas termināla nosaukums)", :id => 5}, 
#   {:code=>"DAP", :shipment_code_flag=>0, :description=>"Piegādāts līdz vietai (galamērķa vietas nosaukums)", :id => 6}, 
#   {:code=>"DDP", :shipment_code_flag=>0, :description=>"Piegādāts ar nodevas samaksu (galamērķa vietas nosaukums)", :id => 7}, 
#   {:code=>"FAS", :shipment_code_flag=>1, :description=>"Franko gar kuģa bortu (iekraušanas ostas nosaukums)", :id => 8}, 
#   {:code=>"FOB", :shipment_code_flag=>1, :description=>"Franko uz kuģa klāja (iekraušanas ostas nosaukums)", :id => 9}, 
#   {:code=>"CFR", :shipment_code_flag=>1, :description=>"Cena un frakts (galamērķa ostas nosaukums)", :id => 10}, 
#   {:code=>"CIF", :shipment_code_flag=>1, :description=>"Cena, apdrošināšana un frakts (galamērķa ostas nosaukums)", :id => 11}].each do |params|
#   puts "Seeding Incoterm with code #{params[:code]}" 
#   if Incoterm.find_by_code(params[:code]).nil?
#     inco = Incoterm.new(:code => params[:code], :id => params[:id], :shipment_code_flag => params[:shipment_code_flag], :description => params[:description] )
#     inco.save(:validate => false)
#   end
# end